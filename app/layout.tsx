import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
// Package stylesheet first so the host's globals.css can override theme tokens.
// The package bundles every Tailwind utility its components reference
// (`bg-card`, `text-foreground`, etc.) — without this they'd be absent from
// the consumer's CSS because Tailwind doesn't scan `node_modules`.
import "@propeller-commerce/propeller-v2-react-ui/styles.css";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { GlobalProvider } from "@/context/GlobalContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { PriceProvider } from "@/context/PriceContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TranslationsProvider } from "@/lib/i18n/client";
import PropellerHostBridge from "@/components/layout/PropellerHostBridge";
import { Toaster } from "react-hot-toast";
import { cookies } from "next/headers";
import { getGlobal } from "@/lib/cms";
import { PREPR_ENABLED } from "@/lib/preprEvent";
import PreprSegmentsSync from "@/components/cms/PreprSegmentsSync";
import PreprPreviewBar from "@/components/cms/PreprPreviewBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Prepr tracking pixel token. The pixel manages the __prepr_uid visitor cookie;
// per-page content events are fired by <PreprTrack> (View for pages/posts, Tag
// for category interest) so Prepr can attribute engagement to the visitor and
// build behavioral segments. Only mounted when Prepr is the active CMS.
const PREPR_TRACKING_TOKEN = process.env.NEXT_PUBLIC_PREPR_TRACKING_TOKEN;

export const metadata: Metadata = {
  title: "Propeller E-commerce",
  description: "Next.js e-commerce powered by Propeller SDK",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [globalData, cookieStore] = await Promise.all([getGlobal(), cookies()]);
  // Seed the price preference from the cookie so SSR and the first client
  // snapshot agree — without this, users see a flash on first paint while
  // React hydrates and reads the cookie. Default is gross (true) when the
  // cookie is absent.
  const includeTaxCookie = cookieStore.get('price_include_tax')?.value;
  const initialIncludeTax =
    includeTaxCookie === undefined ? true : includeTaxCookie === '1';

  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {PREPR_ENABLED && PREPR_TRACKING_TOKEN ? (
          <Script id="prepr-tracking" strategy="afterInteractive">
            {`!function(e,t,p,r,n,a,s){e[r]||((n=e[r]=function(){n.process?n.process.apply(n,arguments):n.queue.push(arguments)}).queue=[],n.t=+new Date,(a=t.createElement(p)).async=1,a.src="https://cdn.tracking.prepr.io/js/prepr_v2.min.js?t="+864e5*Math.ceil(new Date/864e5),(s=t.getElementsByTagName(p)[0]).parentNode.insertBefore(a,s))}(window,document,"script","prepr"),prepr("init","${PREPR_TRACKING_TOKEN}"),prepr("event","pageload");`}
          </Script>
        ) : null}
        {PREPR_ENABLED ? <PreprPreviewBar /> : null}
        <AuthProvider>
          <CompanyProvider>
            {PREPR_ENABLED ? <PreprSegmentsSync /> : null}
            <PriceProvider initialIncludeTax={initialIncludeTax}>
            <LanguageProvider>
            <TranslationsProvider>
            <PropellerHostBridge>
            <CartProvider>
              <GlobalProvider globalData={globalData}>
                {children}
              </GlobalProvider>
              <Toaster position="top-center" reverseOrder={false} />
            </CartProvider>
            </PropellerHostBridge>
            </TranslationsProvider>
            </LanguageProvider>
            </PriceProvider>
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
