import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { GlobalProvider } from "@/context/GlobalContext";
import { Toaster } from "react-hot-toast";
import { getGlobal } from "@/lib/cms/strapi";

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
          <CartProvider>
            <GlobalProvider globalData={globalData}>
              {children}
            </GlobalProvider>
            <Toaster position="top-center" reverseOrder={false} />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
