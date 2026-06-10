"use client";

import { NotificationBell } from "@/components/notificaciones/NotificationBell";

interface DashboardTopbarProps {
  accent?: "indigo" | "violet" | "slate";
}

export function DashboardTopbar({ accent = "indigo" }: DashboardTopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-end px-4 sm:px-6">
      <NotificationBell accent={accent} />
    </header>
  );
}
