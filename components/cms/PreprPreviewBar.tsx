'use client';

import { useEffect } from 'react';
import { PREPR_ENABLED } from '@/lib/preprEvent';

/**
 * Enables Prepr's in-preview **segment & A/B-test switcher** (and visual-editing
 * scroll-sync) without pulling in @preprio/prepr-nextjs.
 *
 * This is a faithful port of that package's `useScrollPosition` hook: when our
 * site runs inside Prepr's preview iframe we post the `prepr_preview_bar`
 * `loaded` event to the parent — that is what makes Prepr reveal the switches in
 * its preview bar. Changing a switch reloads the iframe with
 * `?prepr_preview_segment=<id>` / `?prepr_preview_ab=A|B`, which proxy.ts turns
 * into Prepr-Segments / Prepr-ABTesting headers. Outside an iframe this is a
 * no-op, so the live site is unaffected.
 *
 * Docs: https://docs.prepr.io/project-setup/setting-up-previews-and-visual-editing
 */

type PreprMessage = { name: 'prepr_preview_bar'; event: string } & Record<string, unknown>;

/** Post a `prepr_preview_bar` message to the Prepr parent (matches Prepr's own sendPreprEvent). */
function sendPreprEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const message: PreprMessage = { name: 'prepr_preview_bar', event, ...(data || {}) };
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
}

export default function PreprPreviewBar() {
  useEffect(() => {
    if (!PREPR_ENABLED) return;
    // Only relevant inside Prepr's preview iframe; live site is a no-op.
    if (typeof window === 'undefined' || window.parent === window) return;

    let parentOrigin: string | null = null;

    sendPreprEvent('getScrollPosition', { value: 0 });
    // Handshake — tells Prepr to enable the segment & A/B-test switches.
    sendPreprEvent('loaded');

    const handleMessage = (evt: MessageEvent) => {
      const data = evt.data as { event?: string; scrollPosition?: number } | null;

      // Prepr's init response: remember its origin and, if asked, restore scroll.
      if (data?.event === 'prepr:initVE' && !parentOrigin) {
        parentOrigin = evt.origin;
        if (data.scrollPosition) {
          const top = data.scrollPosition;
          setTimeout(() => window.scrollTo(0, top), 1);
        }
      }

      // After init, only trust messages from Prepr's origin.
      if (evt.origin !== parentOrigin) return;

      // Prepr asks for our scroll position to align its visual-editing overlay.
      if (data?.event === 'prepr:getScrollPosition') {
        const currentScrollY = window.scrollY || document.documentElement.scrollTop;
        sendPreprEvent('getScrollPosition', { value: currentScrollY });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
