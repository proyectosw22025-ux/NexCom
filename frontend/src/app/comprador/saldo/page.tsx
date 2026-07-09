"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { Wallet, Loader2, ArrowDownLeft, ArrowUpRight, Banknote, Info } from "lucide-react";
import { MI_BILLETERA } from "@/graphql/credito";

interface Movimiento {
  id: string; tipo: string; monto: string; ordenId: string | null; descripcion: string | null; creadoEn: string;
}
interface Billetera { disponible: string; movimientos: Movimiento[] }

const TIPO_UI: Record<string, { label: string; icon: typeof ArrowDownLeft; color: string; signo: string }> = {
  REEMBOLSO: { label: "Reembolso recibido", icon: ArrowDownLeft, color: "text-emerald-600", signo: "+" },
  USO:       { label: "Usado en compra",    icon: ArrowUpRight,  color: "text-slate-500",   signo: "−" },
  RETIRO:    { label: "Retiro a banco",     icon: Banknote,      color: "text-slate-500",   signo: "−" },
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CompradorSaldoPage() {
  const { data, loading } = useQuery<{ miBilletera: Billetera }>(MI_BILLETERA, { fetchPolicy: "cache-and-network" });
  const b = data?.miBilletera;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-600" /> Mi billetera
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Aquí llega el dinero de tus devoluciones aprobadas.</p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Saldo */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Saldo disponible</p>
            <p className="text-4xl font-extrabold mt-1">Bs. {b?.disponible ?? "0.00"}</p>
            <p className="text-xs text-indigo-100 mt-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> Podrás usar este crédito en tus próximas compras.
            </p>
          </div>

          {/* Movimientos */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Movimientos</h2>
            </div>
            {(b?.movimientos ?? []).length === 0 ? (
              <div className="text-center py-14">
                <Wallet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Aún no tienes movimientos.</p>
                <p className="text-xs text-slate-400 mt-1">Cuando te aprueben una devolución, el dinero aparecerá aquí.</p>
                <Link href="/comprador/ordenes" className="text-xs text-indigo-600 hover:underline mt-3 inline-block">Ver mis pedidos →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(b?.movimientos ?? []).map((m) => {
                  const ui = TIPO_UI[m.tipo] ?? TIPO_UI.USO;
                  const Icono = ui.icon;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className={`w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center ${ui.color}`}>
                        <Icono className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{ui.label}</p>
                        <p className="text-xs text-slate-400 truncate">{m.descripcion ?? fecha(m.creadoEn)}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${m.tipo === "REEMBOLSO" ? "text-emerald-600" : "text-slate-600"}`}>
                        {ui.signo} Bs. {m.monto}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
