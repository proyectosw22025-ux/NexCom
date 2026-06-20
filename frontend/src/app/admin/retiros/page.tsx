"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { Wallet, Loader2, CheckCircle2, XCircle, Building2, Clock } from "lucide-react";
import { toast } from "sonner";
import { RETIROS_ADMIN, RESOLVER_RETIRO } from "@/graphql/saldos";
import { formatRelativeTime } from "@/lib/format-relative-time";

interface Retiro {
  id: string; monto: string; estado: string; banco: string; numeroCuenta: string; titular: string;
  notaAdmin: string | null; vendedorNombre: string | null; creadoEn: string; resueltoEn: string | null;
}

const ESTADO_UI: Record<string, { color: string; bg: string; label: string }> = {
  PAGADO:    { color: "text-emerald-700", bg: "bg-emerald-100", label: "Pagado" },
  RECHAZADO: { color: "text-red-700",     bg: "bg-red-100",     label: "Rechazado" },
};

export default function AdminRetirosPage() {
  const { data, loading } = useQuery<{ retirosPendientes: Retiro[]; retirosResueltos: Retiro[] }>(
    RETIROS_ADMIN, { fetchPolicy: "cache-and-network" },
  );
  const [resolver, { loading: resolviendo }] = useMutation(RESOLVER_RETIRO);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);

  const pendientes = data?.retirosPendientes ?? [];
  const resueltos  = data?.retirosResueltos ?? [];

  async function handleResolver(id: string, aprobar: boolean) {
    setProcesando(id + aprobar);
    try {
      await resolver({
        variables: { id, aprobar, nota: notas[id]?.trim() || null },
        refetchQueries: [{ query: RETIROS_ADMIN }],
      });
      toast.success(aprobar ? "Retiro marcado como pagado." : "Retiro rechazado.");
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-600" /> Retiros de vendedores
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Procesa las solicitudes de retiro pendientes</p>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Pendientes ({pendientes.length})
            </h2>
            {pendientes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <Clock className="h-9 w-9 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay retiros pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendientes.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-amber-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.vendedorNombre ?? "Vendedor"}</p>
                        <p className="text-xs text-slate-400">{formatRelativeTime(r.creadoEn)}</p>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">Bs. {r.monto}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 mb-3">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span><span className="font-semibold">{r.banco}</span> · Cta. {r.numeroCuenta} · {r.titular}</span>
                    </div>
                    <input
                      value={notas[r.id] ?? ""}
                      onChange={(e) => setNotas((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Nota (opcional, ej. nº de transferencia)…"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolver(r.id, true)} disabled={resolviendo}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        {procesando === r.id + true ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Marcar pagado
                      </button>
                      <button
                        onClick={() => handleResolver(r.id, false)} disabled={resolviendo}
                        className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        {procesando === r.id + false ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {resueltos.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Historial</h2>
              <div className="space-y-2">
                {resueltos.map((r) => {
                  const ui = ESTADO_UI[r.estado] ?? ESTADO_UI.RECHAZADO;
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.vendedorNombre ?? "Vendedor"} · {r.banco}</p>
                        <p className="text-xs text-slate-400">{r.resueltoEn ? formatRelativeTime(r.resueltoEn) : ""}{r.notaAdmin ? ` · ${r.notaAdmin}` : ""}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">Bs. {r.monto}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ui.bg} ${ui.color}`}>{ui.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
