"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href:  string;
  label: string;
  icon:  LucideIcon;
}

type Accent = "indigo" | "violet" | "slate";

const ACCENT: Record<Accent, { active: string; icon: string; brand: string }> = {
  violet: { active: "bg-violet-50 text-violet-700", icon: "text-violet-600", brand: "bg-violet-600" },
  indigo: { active: "bg-indigo-50 text-indigo-700", icon: "text-indigo-600", brand: "bg-indigo-600" },
  slate:  { active: "bg-slate-100 text-slate-900",  icon: "text-slate-700",  brand: "bg-slate-800" },
};

interface Props {
  open:       boolean;
  onClose:    () => void;
  nav:        NavItem[];
  rootHref:   string;          // ruta "inicio" del panel (para no marcarla activa en subrutas)
  accent?:    Accent;
  brandLabel: string;          // ej. "Panel Vendedor"
  userLabel?: string;          // ej. nombre del negocio / usuario
  brandIcon:  LucideIcon;
  onLogout:   () => void;
}

/**
 * Navegación móvil off-canvas compartida por los 3 paneles (vendedor / comprador
 * / admin). Solo se muestra en móvil (`md:hidden`); en desktop el sidebar fijo se
 * mantiene. Reusa el mismo array `nav` de cada layout — un único patrón, sin
 * divergencias entre roles.
 */
export function MobileNavDrawer({
  open, onClose, nav, rootHref, accent = "indigo", brandLabel, userLabel, brandIcon: Brand, onLogout,
}: Props) {
  const pathname = usePathname();
  const c = ACCENT[accent];

  // Cerrar con Escape + bloquear el scroll del fondo mientras está abierto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú de navegación">
      <div onClick={onClose} aria-hidden="true" data-testid="drawer-backdrop" className="absolute inset-0 bg-black/40 animate-fade-in-backdrop" />
      <div className="absolute left-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-xl flex flex-col animate-slide-in-left">
        {/* Cabecera */}
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className={`w-8 h-8 ${c.brand} rounded-lg flex items-center justify-center shrink-0`}>
              <Brand className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">NexCom</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{brandLabel}</p>
            </div>
          </Link>
          <button onClick={onClose} aria-label="Cerrar menú" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {userLabel && (
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{userLabel}</p>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== rootHref && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active ? `${c.active} shadow-sm` : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? c.icon : "text-slate-400"}`} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
