import Script from 'next/script';
import { GA4_ENABLED, GA4_MEASUREMENT_ID, GTM_CONTAINER_ID, GTM_MODE } from '@/lib/tracking/ga4';

/**
 * Loads Google's tags (PWP-910). Renders nothing when `USE_GA4` is off.
 *
 * A **Server Component** on purpose: injecting a script tag needs no client
 * JavaScript, so the snippet costs nothing in the bundle. The subscriber that
 * actually maps and pushes events is registered in `TrackingBridge`, which
 * already owns subscriber wiring.
 *
 * `afterInteractive` matches the Prepr pixel next to it in `app/layout.tsx`.
 * `beforeInteractive` is documented for critical scripts only, and analytics is
 * not that — the subscriber creates `window.dataLayer` itself, so events fired
 * before Google's script lands queue in the array rather than dropping.
 *
 * Both ids need allowlisting in the CSP (`proxy.ts`), or the browser blocks the
 * script and nothing is collected. That is wired to the same flag.
 */
export default function GoogleTags() {
  if (!GA4_ENABLED) return null;

  if (GTM_MODE) {
    return (
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`}
      </Script>
    );
  }

  return (
    <>
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {/* `send_page_view: false` because we emit `page_view` ourselves from the
            route islands. Leaving it on double-counts the first page of every
            session, and the automatic one would miss client-side navigations
            anyway. */}
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_MEASUREMENT_ID}',{send_page_view:false});`}
      </Script>
    </>
  );
}
