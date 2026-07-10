"use client";

import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { NotificationBell } from "@/components/notificaciones/NotificationBell";
import { ThemeMenu } from "@/components/layout/ThemeMenu";
import { useUiPrefs } from "@/context/ui-prefs-context";

interface DashboardTopbarProps {
  accent?: "indigo" | "violet" | "slate";
  /** Abre el menú móvil (drawer). La hamburguesa solo aparece si se pasa. */
  onMenu?: () => void;
}

export function DashboardTopbar({ accent = "indigo", onMenu }: DashboardTopbarProps) {
  const { sidebarColapsado, toggleSidebar } = useUiPrefs();
  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Móvil: hamburguesa que abre el drawer */}
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Abrir menú"
          className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      {/* Desktop: colapsar/expandir el sidebar */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarColapsado ? "Expandir menú" : "Colapsar menú"}
        title={sidebarColapsado ? "Expandir menú" : "Colapsar menú"}
        className="hidden md:inline-flex p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
      >
        {sidebarColapsado ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>
      <div className="flex items-center gap-1">
        <ThemeMenu />
        <NotificationBell accent={accent} />
      </div>
    </header>
  );
}
