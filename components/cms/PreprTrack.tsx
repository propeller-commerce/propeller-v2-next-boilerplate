'use client';

import { useEffect } from 'react';
import { PREPR_ENABLED } from '@/lib/preprEvent';

interface PreprTrackProps {
  /**
   * Prepr content-item id. Fires a `View` event for this item — used on pages
   * and blog posts so Prepr records content engagement against the visitor and
   * can build behavioral/interest segments from it. (Typed loosely because the
   * CmsPage/CmsArticle id is declared `number` but holds Prepr's string `_id`.)
   */
  itemId?: string | number;
  /**
   * Visitor interest tags. Fires a `Tag` event — used on commerce category
   * pages, which are Propeller entities (not Prepr content items) and so have no
   * content-item id to view. Tagging records the visitor's interest instead.
   */
  tags?: string[];
}

/**
 * Records a Prepr data-collection event for the current page through the
 * tracking pixel (`window.prepr`, initialised in the root layout).
 *
 * Rendering this on a content page is what actually creates/updates the visitor
 * profile and powers behavioral segments — a bare page load with no event, or an
 * event with no content reference, does not. The visitor id comes from the
 * shared `__prepr_uid` cookie (set by proxy.ts, read by the pixel), so tracking
 * and personalization resolve to the same visitor.
 *
 * No-ops entirely unless Prepr is the active CMS.
 */
export default function PreprTrack({ itemId, tags }: PreprTrackProps) {
  // Stable primitive deps so the effect fires once per content item / tag set.
  const id = itemId !== undefined && itemId !== null && itemId !== '' ? String(itemId) : '';
  const tagKey = (tags || []).filter(Boolean).join(',');

  useEffect(() => {
    if (!PREPR_ENABLED) return;
    if (!id && !tagKey) return;

    let cancelled = false;
    let attempts = 0;

    const fire = (): boolean => {
      const prepr = (window as unknown as { prepr?: (...args: unknown[]) => void }).prepr;
      if (typeof prepr !== 'function') return false;
      if (id) prepr('event', 'View', { id });
      else prepr('event', 'Tag', tagKey.split(','));
      return true;
    };

    // The pixel loads `afterInteractive`, so `window.prepr` may not be defined
    // yet when this effect runs; poll briefly until it is (then stop).
    if (fire()) return;
    const timer = setInterval(() => {
      attempts += 1;
      if (cancelled || fire() || attempts > 50) clearInterval(timer);
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, tagKey]);

  return null;
}
