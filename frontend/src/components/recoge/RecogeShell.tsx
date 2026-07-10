"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Wallet, WifiOff } from "lucide-react";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const NAV = [
  { href: "/recoge",          label: "Inicio",   icon: Home },
  { href: "/recoge/escanear", label: "Escanear", icon: QrCode },
  { href: "/recoge/saldo",    label: "Saldo",    icon: Wallet },
];

/** Contenedor móvil de la app "Recoge NexCom": barra superior, contenido y
 *  navegación inferior fija. Registra el service worker e indica si no hay red. */
export function RecogeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const online = useOnlineStatus();

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col max-w-md mx-auto">
      <ServiceWorkerRegister />

      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-indigo-600 text-white px-4 py-3 flex items-center gap-2"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
          <QrCode className="h-4 w-4" />
        </div>
        <p className="font-bold text-sm">Recoge NexCom</p>
        {!online && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold bg-white/15 px-2 py-1 rounded-full">
            <WifiOff className="h-3 w-3" /> Sin conexión
          </span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Navegación inferior */}
      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white border-t border-slate-200 grid grid-cols-3 z-30"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/recoge" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}>
              <Icon className={`h-5 w-5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
