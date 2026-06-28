import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ApolloClientProvider } from "@/lib/apollo-provider";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { UiPrefsProvider } from "@/context/ui-prefs-context";
import "./globals.css";

// Aplica el tema antes del primer paint (sin parpadeo / sin mismatch de hidratación)
const themeScript = `(function(){try{var m=localStorage.getItem('nexcom-modo')||'auto';var s=localStorage.getItem('nexcom-skin')||'joven';var r=m;if(m==='auto'){var h=new Date().getHours();r=(h>=19||h<7)?'oscuro':'claro';}var el=document.documentElement;el.setAttribute('data-theme',r==='oscuro'?'dark':'light');el.setAttribute('data-skin',s);}catch(e){}})();`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        <ApolloClientProvider>
          <AuthProvider>
            <UiPrefsProvider>
              <CartProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
              </CartProvider>
            </UiPrefsProvider>
          </AuthProvider>
        </ApolloClientProvider>
      </body>
    </html>
  );
}
