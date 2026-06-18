import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ApolloClientProvider } from "@/lib/apollo-provider";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// metadataBase: dominio de producción (configurable por env). Permite que las
// URLs de Open Graph / imágenes compartidas sean absolutas. Fallback a local.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:  "NexCom — Marketplace Local Boliviano",
    template: "%s · NexCom",
  },
  description: "Conectamos compradores y vendedores de Santa Cruz, Bolivia. Compra y vende productos de microempresas locales.",
  applicationName: "NexCom",
  openGraph: {
    type:        "website",
    siteName:    "NexCom",
    title:       "NexCom — Marketplace Local Boliviano",
    description: "Compra y vende productos de microempresas de Santa Cruz, Bolivia.",
    locale:      "es_BO",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        <ApolloClientProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </CartProvider>
          </AuthProvider>
        </ApolloClientProvider>
      </body>
    </html>
  );
}
