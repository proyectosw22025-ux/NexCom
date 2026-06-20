"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, Users, Package, BarChart2, Settings, Shield, LogOut, Wallet } from "lucide-react";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";

const NAV = [
  { href: "/admin",               label: "Dashboard",     icon: LayoutDashboard, exact: true },
  { href: "/admin/usuarios",      label: "Usuarios",      icon: Users },
  { href: "/admin/productos",     label: "Productos",     icon: Package },
  { href: "/admin/retiros",       label: "Retiros",       icon: Wallet },
  { href: "/admin/reportes",      label: "Reportes",      icon: BarChart2 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.rol !== "ADMIN")) {
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
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">NexCom</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Administración</p>
            </div>
          </Link>
        </div>

        <div className="px-3 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-400">Administrador</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-slate-700" : "text-slate-400"}`} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-500" />}
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
        <DashboardTopbar accent="slate" />
        {children}
      </main>
    </div>
  );
}
