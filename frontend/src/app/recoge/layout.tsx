import type { Metadata, Viewport } from "next";
import { RecogeShell } from "@/components/recoge/RecogeShell";

export const metadata: Metadata = {
  title: "Recoge NexCom",
  description: "Recoge tus pedidos, revisa tu saldo y reportes. Funciona con y sin conexión.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Recoge NexCom", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RecogeLayout({ children }: { children: React.ReactNode }) {
  return <RecogeShell>{children}</RecogeShell>;
}
