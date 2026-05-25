import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ApolloClientProvider } from "@/lib/apollo-provider";
import { AuthProvider } from "@/context/auth-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexCom — Marketplace Local Boliviano",
  description: "Conectamos compradores y vendedores de Santa Cruz, Bolivia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        <ApolloClientProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </ApolloClientProvider>
      </body>
    </html>
  );
}
