'use client';
/**
 * Friendly error view rendered inside a route when the resource fetch
 * returned 403 / 404 / a generic error. Used by /account/orders/[id] and
 * /checkout/thank-you/[orderId] so users see a translated message instead
 * of a raw GraphQL string like "Forbidden resource".
 *
 * Inline render (same route, no redirect) — matches `not-found.tsx`.
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { localizeHref } from '@/data/config';
import { useTranslations } from '@/lib/i18n/client';
import { useAuth } from '@/context/AuthContext';
import type { ApiErrorKind } from '@/lib/errors';

export interface AccessErrorViewProps {
  /** Classified error kind. Decides icon, title, message, default action. */
  kind: ApiErrorKind;
  /**
   * Optional override for the primary "go back" link.
   * Defaults to /account/orders for `forbidden`/`not-found` on order
   * detail / thank-you pages; pass an explicit href for other contexts.
   */
  backHref?: string;
  /** Optional override for the primary button label. */
  backLabel?: string;
}

export default function AccessErrorView(props: AccessErrorViewProps) {
  const { language } = useLanguage();
  const { state: authState } = useAuth();
  const t = useTranslations('ErrorPages');

  const isForbidden = props.kind === 'forbidden';
  const isNotFound = props.kind === 'not-found';

  const title = isForbidden
    ? t.notAuthorizedTitle
    : isNotFound
      ? t.notFoundTitle
      : t.genericErrorTitle;
  const message = isForbidden
    ? t.notAuthorizedMessage
    : isNotFound
      ? t.notFoundMessage
      : t.genericErrorMessage;

  const defaultBackHref = isForbidden || isNotFound ? '/account/orders' : '/';
  const defaultBackLabel = isForbidden || isNotFound ? t.backToOrders : t.backToHome;
  const backHref = props.backHref ?? defaultBackHref;
  const backLabel = props.backLabel ?? defaultBackLabel;

  // Show a sign-in CTA when the user is unauthenticated AND we got a 403 —
  // they may legitimately not have access yet because they're not signed in.
  const showSignIn = isForbidden && !authState.isAuthenticated;

  return (
    <div className="propeller-access-error mx-auto max-w-md py-16 px-4 text-center">
      <div
        className="propeller-access-error__icon mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-destructive"
        >
          {isForbidden ? (
            // Lock icon
            <>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </>
          ) : isNotFound ? (
            // Search-not-found icon
            <>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </>
          ) : (
            // Alert-triangle icon
            <>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </>
          )}
        </svg>
      </div>

      <h1 className="propeller-access-error__title mb-3 text-2xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="propeller-access-error__message mb-8 text-muted-foreground">
        {message}
      </p>

      <div className="propeller-access-error__actions flex flex-col gap-3 sm:flex-row sm:justify-center">
        {showSignIn ? (
          <Button asChild>
            <Link href={localizeHref('/login', language)}>{t.signInButton}</Link>
          </Button>
        ) : null}
        <Button asChild variant={showSignIn ? 'outline' : 'default'}>
          <Link href={localizeHref(backHref, language)}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
