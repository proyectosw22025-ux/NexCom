"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, Tag, LogOut, Store, ShoppingBag, Star, Ticket, Crown, RotateCcw, Wallet, ShieldCheck,
} from "lucide-react";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { useUiPrefs } from "@/context/ui-prefs-context";

const NAV = [
  { href: "/vendedor",              label: "Panel",         icon: LayoutDashboard },
  { href: "/vendedor/productos",    label: "Mis Productos", icon: Package },
  { href: "/vendedor/ofertas",      label: "Ofertas",       icon: Tag },
  { href: "/vendedor/cupones",      label: "Cupones",       icon: Ticket },
  { href: "/vendedor/ordenes",      label: "Órdenes",       icon: ShoppingBag },
  { href: "/vendedor/saldo",        label: "Saldo",         icon: Wallet },
  { href: "/vendedor/devoluciones", label: "Devoluciones",  icon: RotateCcw },
  { href: "/vendedor/valoraciones", label: "Valoraciones",  icon: Star },
  { href: "/vendedor/verificacion", label: "Verificación",  icon: ShieldCheck },
  { href: "/vendedor/plan",         label: "Mi plan",       icon: Crown },
];

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { sidebarColapsado: col } = useUiPrefs();
  const router   = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const cerrarSesion = async () => { await logout(); router.replace("/"); };

  useEffect(() => {
    if (!isLoading && (!user || user.rol !== "VENDEDOR")) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (solo desktop) */}
      <aside className={`${col ? "w-[4.5rem]" : "w-60"} transition-[width] duration-300 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 sticky top-0 h-screen`}>
        <div className="px-4 py-5 border-b border-slate-100">
          <Link href="/" className={`flex items-center gap-2.5 ${col ? "justify-center" : ""}`} title="NexCom">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
              <Store className="h-4 w-4 text-white" />
            </div>
            {!col && (
              <div>
                <p className="text-xs font-bold text-slate-900 leading-none">NexCom</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Panel Vendedor</p>
              </div>
            )}
          </Link>
        </div>

        <div className="px-3 py-4 border-b border-slate-100">
          <div className={`flex items-center gap-3 ${col ? "justify-center" : "px-2"}`} title={user.perfilVendedor?.nombreNegocio ?? "Mi Tienda"}>
            <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
              <Store className="h-4 w-4 text-violet-600" />
            </div>
            {!col && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user.perfilVendedor?.nombreNegocio ?? "Mi Tienda"}
                </p>
                <p className="text-[10px] text-slate-400">Vendedor</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/vendedor" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${col ? "justify-center" : ""} ${
                  active
                    ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-violet-600" : "text-slate-400"}`} />
                {!col && label}
                {!col && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={async () => { await logout(); router.replace("/"); }}
            title="Cerrar sesión"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-red-600 hover:bg-red-50 transition-colors ${col ? "justify-center" : ""}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!col && "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* Drawer móvil */}
      <MobileNavDrawer
        open={mobileNav} onClose={() => setMobileNav(false)}
        nav={NAV} rootHref="/vendedor" accent="violet"
        brandLabel="Panel Vendedor" brandIcon={Store}
        userLabel={user.perfilVendedor?.nombreNegocio ?? "Mi Tienda"}
        onLogout={cerrarSesion}
      />

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0">
        <DashboardTopbar accent="violet" onMenu={() => setMobileNav(true)} />
        {children}
      </main>
    </div>
  );
}
