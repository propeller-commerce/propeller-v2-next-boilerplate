'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Prefetch-on-hover for catalog grids/sliders.
 *
 * The package cards (ClusterCard / ProductCard) render a plain `<a href>` and
 * navigate via an `onClick` → `router.push`, not a Next `<Link>`. A plain
 * anchor never prefetches, so every click paid a full RSC round-trip before the
 * `loading.tsx` skeleton could stream — felt as click lag, and worse when
 * logged in (catalog pages go dynamic, bypassing the anonymous cache).
 *
 * The card already puts the real destination in the DOM (`href={clusterUrl}`),
 * so we delegate `mouseover` on the grid container to the nearest same-origin
 * anchor and `router.prefetch` it — exactly what `<Link>` does on hover. The
 * loading shell lands in the client Router Cache, so the click paints the
 * skeleton instantly and only the (slower, when logged-in) data streams in.
 *
 * Returns a handler to spread on the element wrapping the cards.
 */
export function useHoverPrefetch() {
  const router = useRouter();
  const seen = useRef<Set<string>>(new Set());

  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href]') as
        | HTMLAnchorElement
        | null;
      const href = anchor?.getAttribute('href');
      // ponytail: internal, same-origin paths only — skip externals/hashes.
      if (!href || !href.startsWith('/') || seen.current.has(href)) return;
      seen.current.add(href);
      router.prefetch(href);
    },
    [router]
  );
}
