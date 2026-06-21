"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Code-split: recharts (~70kB) y el dashboard solo se cargan en esta ruta.
const AnaliticaDashboard = dynamic(
  () => import("@/components/admin/AnaliticaDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="text-xs text-slate-400">Cargando analítica…</p>
      </div>
    ),
  },
);

export default function AdminAnaliticaPage() {
  return <AnaliticaDashboard />;
}
