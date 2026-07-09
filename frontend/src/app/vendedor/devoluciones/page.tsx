"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { RotateCcw, Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DEVOLUCIONES_VENDEDOR, RESPONDER_DEVOLUCION } from "@/graphql/devoluciones";
import { formatRelativeTime } from "@/lib/format-relative-time";

interface Devolucion {
  id: string; ordenId: string; ordenIdCorto: string; motivo: string; estado: string;
  tipoProblema?: string | null; evidenciaUrls?: string[];
  montoReembolso: string; respuestaVendedor: string | null; otroNombre: string; creadoEn: string;
}

const TIPO_LABEL: Record<string, string> = {
  DEFECTUOSO: "Llegó dañado", NO_CORRESPONDE: "No es lo pedido", INCOMPLETO: "Incompleto", OTRO: "Otro",
};

const ESTADO_UI: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  SOLICITADA:  { icon: Clock,        color: "text-amber-700",   bg: "bg-amber-100",   label: "En revisión" },
  REEMBOLSADA: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-100", label: "Reembolsada" },
  RECHAZADA:   { icon: XCircle,      color: "text-red-700",     bg: "bg-red-100",     label: "Rechazada" },
};

export default function VendedorDevolucionesPage() {
  const { data, loading } = useQuery<{ devolucionesVendedor: Devolucion[] }>(DEVOLUCIONES_VENDEDOR, {
    fetchPolicy: "cache-and-network",
  });
  const [responder, { loading: respondiendo }] = useMutation(RESPONDER_DEVOLUCION);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);

  const devoluciones = data?.devolucionesVendedor ?? [];
  const pendientes = devoluciones.filter((d) => d.estado === "SOLICITADA");
  const resueltas  = devoluciones.filter((d) => d.estado !== "SOLICITADA");

  async function handleResponder(id: string, aprobar: boolean) {
    setProcesando(id + aprobar);
    try {
      await responder({
        variables: { id, aprobar, respuesta: respuestas[id]?.trim() || null },
        refetchQueries: [{ query: DEVOLUCIONES_VENDEDOR }],
      });
      toast.success(aprobar ? "Devolución aprobada y reembolsada." : "Devolución rechazada.");
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
          <RotateCcw className="h-6 w-6 text-indigo-600" /> Devoluciones
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Solicitudes de devolución de tus compradores</p>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
      ) : devoluciones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <RotateCcw className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No tienes solicitudes de devolución</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Pendientes ({pendientes.length})
              </h2>
              <div className="space-y-3">
                {pendientes.map((d) => (
                  <div key={d.id} className="bg-white rounded-2xl border border-amber-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">Orden #{d.ordenIdCorto}</p>
                          <Link href={`/vendedor/ordenes/${d.ordenId}`} className="text-slate-400 hover:text-indigo-600">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-slate-400">{d.otroNombre} · {formatRelativeTime(d.creadoEn)}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">Bs. {d.montoReembolso}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                      {d.tipoProblema && (
                        <span className="inline-block text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1.5">
                          {TIPO_LABEL[d.tipoProblema] ?? d.tipoProblema}
                        </span>
                      )}
                      <p className="text-sm text-slate-600"><span className="font-semibold">Motivo:</span> {d.motivo}</p>
                      {d.evidenciaUrls && d.evidenciaUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {d.evidenciaUrls.map((u) => (
                            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                              <Image src={u} alt="Evidencia" fill className="object-cover" />
                              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <ExternalLink className="h-4 w-4 text-white" />
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      value={respuestas[d.id] ?? ""}
                      onChange={(e) => setRespuestas((r) => ({ ...r, [d.id]: e.target.value }))}
                      placeholder="Respuesta para el comprador (opcional)…"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResponder(d.id, true)}
                        disabled={respondiendo}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                                   text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        {procesando === d.id + true ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Aprobar y reembolsar
                      </button>
                      <button
                        onClick={() => handleResponder(d.id, false)}
                        disabled={respondiendo}
                        className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50
                                   text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        {procesando === d.id + false ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Resueltas */}
          {resueltas.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resueltas</h2>
              <div className="space-y-2">
                {resueltas.map((d) => {
                  const ui = ESTADO_UI[d.estado] ?? ESTADO_UI.SOLICITADA;
                  const Icono = ui.icon;
                  return (
                    <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ui.bg}`}>
                        <Icono className={`h-4 w-4 ${ui.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">Orden #{d.ordenIdCorto} · {d.otroNombre}</p>
                        <p className="text-xs text-slate-400 truncate">{d.motivo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-semibold ${ui.color}`}>{ui.label}</span>
                        <p className="text-xs text-slate-400">Bs. {d.montoReembolso}</p>
                      </div>
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
