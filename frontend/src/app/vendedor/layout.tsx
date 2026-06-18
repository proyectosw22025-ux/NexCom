"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard, Package, Tag, LogOut, Store, ShoppingBag, Star, Ticket,
} from "lucide-react";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";

const NAV = [
  { href: "/vendedor",              label: "Panel",         icon: LayoutDashboard },
  { href: "/vendedor/productos",    label: "Mis Productos", icon: Package },
  { href: "/vendedor/ofertas",      label: "Ofertas",       icon: Tag },
  { href: "/vendedor/cupones",      label: "Cupones",       icon: Ticket },
  { href: "/vendedor/ordenes",      label: "Órdenes",       icon: ShoppingBag },
  { href: "/vendedor/valoraciones", label: "Valoraciones",  icon: Star },
];

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.rol !== "VENDEDOR")) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-4 py-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">NexCom</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Panel Vendedor</p>
            </div>
          </Link>
        </div>

        <div className="px-3 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center">
              <Store className="h-4 w-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user.perfilVendedor?.nombreNegocio ?? "Mi Tienda"}
              </p>
              <p className="text-[10px] text-slate-400">Vendedor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/vendedor" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-violet-600" : "text-slate-400"}`} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={async () => { await logout(); router.replace("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <DashboardTopbar accent="violet" />
        {children}
      </main>
    </div>
  );
}
