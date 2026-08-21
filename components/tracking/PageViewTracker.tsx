'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/tracking';
import type { PageType } from '@/lib/tracking';

/**
 * Generic `page_viewed` for every route that does not report itself.
 *
 * Uses `usePathname()` only — deliberately NOT `useSearchParams()`, which opts
 * a route into dynamic rendering and needs a Suspense boundary. Reaching for it
 * here would quietly deopt the static generation of every Server Component
 * shell, which is the thing the hybrid-SSR work exists to protect.
 *
 * Routes whose islands emit a richer `page_viewed` (they hold the entity id and
 * name) are skipped, so a category view produces one row, not two.
 */

const SELF_REPORTING = [
  '/category/',
  '/product/',
  '/search',
  '/cart',
  '/checkout',
];

/** Strip a locale prefix — the browser URL keeps it, the rewrite happens server-side. */
function stripLocale(pathname: string): string {
  return /^\/[a-z]{2}(\/|$)/.test(pathname) ? pathname.slice(3) || '/' : pathname;
}

function classify(path: string): { pageType: PageType; entityId: number | null } | null {
  if (SELF_REPORTING.some((p) => path === p || path.startsWith(p))) return null;

  if (path === '/') return { pageType: 'home', entityId: null };
  if (path.startsWith('/cluster/')) {
    const id = Number(path.split('/')[2]);
    return { pageType: 'cluster', entityId: Number.isFinite(id) ? id : null };
  }
  if (path.startsWith('/account/quote')) return { pageType: 'quote', entityId: null };
  if (path.startsWith('/account/favorites')) return { pageType: 'favorites', entityId: null };
  if (path.startsWith('/account')) return { pageType: 'account', entityId: null };
  if (path.startsWith('/machines')) return { pageType: 'machines', entityId: null };
  if (path.startsWith('/quick-order')) return { pageType: 'quick_order', entityId: null };
  if (path.startsWith('/blog')) return { pageType: 'blog', entityId: null };
  if (path.startsWith('/login') || path.startsWith('/magic-login')) return { pageType: 'login', entityId: null };
  if (path.startsWith('/register')) return { pageType: 'register', entityId: null };
  return { pageType: 'cms', entityId: null };
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const path = stripLocale(pathname);
    const hit = classify(path);
    if (!hit) return;
    track(
      'page_viewed',
      { page_type: hit.pageType, entity_type: hit.entityId ? hit.pageType : null, entity_id: hit.entityId, path },
      `page_viewed:${hit.pageType}:${hit.entityId ?? path}`
    );
  }, [pathname]);

  return null;
}
