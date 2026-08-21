/**
 * True when Prepr is the active CMS provider. Gates all Prepr client-side
 * wiring (tracking events, PreprTrack, segments sync, preview bar) so a
 * Strapi/Contentful/none build ships none of it. `NEXT_PUBLIC_CMS_PROVIDER`
 * is inlined at build time, so on a non-Prepr build these gates collapse to
 * `if (false)` and the wiring is dead-code-eliminated from the bundle.
 */
export const PREPR_ENABLED =
  (process.env.NEXT_PUBLIC_CMS_PROVIDER || process.env.CMS_PROVIDER) === 'prepr';

/**
 * Fire a Prepr data-collection event through the tracking pixel (window.prepr,
 * initialised in the root layout).
 *
 * Used for CONVERSION events (e.g. QuoteRequest, AddToCart). Prepr correlates
 * these to the adaptive-content variants the visitor was shown (via the shared
 * __prepr_uid / Prepr-Customer-Id), so they appear as conversions on the
 * personalized components. Tracking must never break the app, so this no-ops
 * when Prepr isn't the CMS, on the server, before the pixel has initialised, or
 * on any error.
 */
export function trackPreprEvent(event: string, props?: Record<string, unknown>): void {
  if (!PREPR_ENABLED) return;
  try {
    if (typeof window === 'undefined') return;
    const prepr = (window as unknown as { prepr?: (...args: unknown[]) => void }).prepr;
    if (typeof prepr !== 'function') return;
    if (props) prepr('event', event, props);
    else prepr('event', event);
  } catch {
    /* ignore — analytics must not affect the user flow */
  }
}
