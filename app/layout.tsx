import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Package stylesheet first so the host's globals.css can override theme tokens.
// The package bundles every Tailwind utility its components reference
// (`bg-card`, `text-foreground`, etc.) — without this they'd be absent from
// the consumer's CSS because Tailwind doesn't scan `node_modules`.
import "propeller-v2-react-ui/styles.css";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { GlobalProvider } from "@/context/GlobalContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { PriceProvider } from "@/context/PriceContext";
import { LanguageProvider } from "@/context/LanguageContext";
import PropellerHostBridge from "@/components/layout/PropellerHostBridge";
import { Toaster } from "react-hot-toast";
import { getGlobal } from "@/lib/cms";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Propeller E-commerce",
  description: "Next.js e-commerce powered by Propeller SDK",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const globalData = await getGlobal();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <CompanyProvider>
            <PriceProvider>
            <LanguageProvider>
            <PropellerHostBridge>
            <CartProvider>
              <GlobalProvider globalData={globalData}>
                {children}
              </GlobalProvider>
              <Toaster position="top-center" reverseOrder={false} />
            </CartProvider>
            </PropellerHostBridge>
            </LanguageProvider>
            </PriceProvider>
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
