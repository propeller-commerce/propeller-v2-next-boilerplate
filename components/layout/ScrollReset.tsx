'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scrolls to the top on every route change — the Next equivalent of
 * vue-boilerplate's `scrollBehavior: () => ({ top: 0 })`.
 *
 * Each page renders its own Header/Footer instead of sharing a layout, so the
 * browser restores the previous page's offset and a PDP opened from far down
 * the homepage lands mid-page.
 */
export default function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
