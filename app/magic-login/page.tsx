'use client';

/**
 * Magic-token login entry — `/magic-login?mtoken=<token>` (optional `?redirect=`).
 *
 * The token is backend/ERP-issued (the punchout / passwordless deep-link
 * handoff). On mount we clear any stale session (so the exchange is anonymous
 * and can hand off to a different contact), exchange the token for a session via
 * the package `useAuth().magicLogin`, then run the shared post-login sequence
 * (`useAfterLogin`) — identical to password login — and redirect. A dead/expired
 * token bounces to the login page with `?magic_expired=1`.
 *
 * `useSearchParams()` forces a client bailout, so the reader lives under a
 * <Suspense> boundary (required for the route to build).
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth as usePropellerAuth } from '@propeller-commerce/propeller-v2-react-ui';
import { graphqlClient } from '@/lib/api';
import { config, localizeHref, stripLanguagePrefix } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useAfterLogin } from '@/lib/useAfterLogin';

function Spinner() {
  return <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />;
}

function MagicLoginRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const runAfterLogin = useAfterLogin();
  const { magicLogin } = usePropellerAuth({ graphqlClient, configuration: config });
  const [failed, setFailed] = useState(false);
  // Guard against React StrictMode's double-effect (and any re-render) so the
  // single-use token is exchanged exactly once.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = searchParams.get('mtoken');
    const redirect = searchParams.get('redirect') || undefined;
    const expired = () => router.replace(`${localizeHref('/login', language)}?magic_expired=1`);

    (async () => {
      if (!token) {
        setFailed(true);
        expired();
        return;
      }
      // Clear any stale session first: the exchange must not carry a prior
      // access token (matches the WP flow), and this lets a magic link hand off
      // to a DIFFERENT contact than the one currently signed in.
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        /* best-effort */
      }

      const res = await magicLogin(token);
      if (!res.ok || !res.data.user) {
        setFailed(true);
        expired();
        return;
      }

      const { effectiveLanguage, navigated } = await runAfterLogin(
        res.data.user,
        res.data.accessToken,
        res.data.refreshToken,
        res.data.expiresAt,
        null,
        redirect ? stripLanguagePrefix(redirect) : '/',
      );
      if (!navigated) {
        router.replace(redirect || localizeHref('/', effectiveLanguage));
      }
    })();
    // Run once on mount — deliberately not reactive to searchParams/hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {!failed && <Spinner />}
      <p className="text-muted-foreground">
        {failed ? 'This login link is no longer valid. Redirecting…' : 'Signing you in…'}
      </p>
    </div>
  );
}

export default function MagicLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container-width flex items-center justify-center py-12">
        <Suspense fallback={<Spinner />}>
          <MagicLoginRunner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
