"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import Link from "next/link";
import { DISPUTAS_PENDIENTES, RESOLVER_DISPUTA } from "@/graphql/disputas";
import { PageHero } from "@/components/ui/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldAlert, Loader2, Store, User, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Disputa {
  id: string; ordenId: string; ordenCorto: string; motivo: string; descripcion: string | null;
  evidenciaUrl: string | null; estado: string; resolucionNota: string | null; total: string | null;
  compradorNombre: string | null; vendedorNombre: string | null; creadoEn: string; resueltoEn: string | null;
}

const MOTIVO_LABEL: Record<string, string> = {
  NO_RECIBIDO: "No recibido", PRODUCTO_INCORRECTO: "Producto incorrecto", DANADO: "Llegó dañado", OTRO: "Otro",
};
const ESTADO_LABEL: Record<string, { label: string; clase: string }> = {
  RESUELTA_COMPRADOR: { label: "Reembolso al comprador", clase: "text-emerald-600" },
  RESUELTA_VENDEDOR:  { label: "Liberado al vendedor",   clase: "text-slate-600" },
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminDisputasPage() {
  const { data, loading, refetch } = useQuery<{ disputasPendientes: Disputa[]; disputasResueltas: Disputa[] }>(
    DISPUTAS_PENDIENTES, { fetchPolicy: "cache-and-network" },
  );
  const [resolver] = useMutation(RESOLVER_DISPUTA);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  const pendientes = data?.disputasPendientes ?? [];
  const resueltas  = data?.disputasResueltas ?? [];

  async function handleResolver(d: Disputa, aFavor: "COMPRADOR" | "VENDEDOR") {
    setResolviendo(d.id + aFavor);
    try {
      await resolver({ variables: { disputaId: d.id, aFavor, nota: notas[d.id]?.trim() || null } });
      toast.success(aFavor === "COMPRADOR" ? "Reembolso aplicado al comprador." : "Pago liberado al vendedor.");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    } finally {
      setResolviendo(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHero
        titulo="Disputas"
        subtitulo="Media reclamos de Compra Protegida y libera o reembolsa la garantía"
        icon={ShieldAlert}
        tono="slate"
      />

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando disputas…</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pendientes */}
          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              Por mediar {pendientes.length > 0 && <span className="text-amber-600">({pendientes.length})</span>}
            </h2>
            {pendientes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState icon={CheckCircle} titulo="Sin disputas pendientes" subtitulo="No hay reclamos por mediar ahora mismo." />
              </div>
            ) : (
              <div className="space-y-4">
                {pendientes.map((d) => (
                  <div key={d.id} className="bg-white rounded-2xl border border-amber-200 p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                            {MOTIVO_LABEL[d.motivo] ?? d.motivo}
                          </span>
                          <Link href={`/admin`} className="text-sm font-bold text-slate-900">Orden #{d.ordenCorto}</Link>
                          {d.total && <span className="text-sm font-semibold text-slate-500">· Bs. {d.total}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {d.compradorNombre ?? "—"}</span>
                          <span className="flex items-center gap-1"><Store className="h-3.5 w-3.5" /> {d.vendedorNombre ?? "—"}</span>
                          <span>{fecha(d.creadoEn)}</span>
                        </div>
                        {d.descripcion && <p className="text-sm text-slate-600 mt-2">“{d.descripcion}”</p>}
                        {d.evidenciaUrl && (
                          <a href={d.evidenciaUrl} target="_blank" rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2">
                            <ExternalLink className="h-3 w-3" /> Ver evidencia
                          </a>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={notas[d.id] ?? ""}
                      onChange={(e) => setNotas((n) => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Nota de resolución (opcional)…"
                      rows={2}
                      className="w-full mt-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleResolver(d, "COMPRADOR")}
                        disabled={!!resolviendo}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        {resolviendo === d.id + "COMPRADOR" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Reembolsar al comprador
                      </button>
                      <button
                        onClick={() => handleResolver(d, "VENDEDOR")}
                        disabled={!!resolviendo}
                        className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        {resolviendo === d.id + "VENDEDOR" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Liberar al vendedor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Resueltas */}
          {resueltas.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-900 mb-3">Resueltas</h2>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {resueltas.map((d) => {
                      const ui = ESTADO_LABEL[d.estado] ?? { label: d.estado, clase: "text-slate-500" };
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-medium text-slate-900">#{d.ordenCorto}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{MOTIVO_LABEL[d.motivo] ?? d.motivo}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{d.compradorNombre} → {d.vendedorNombre}</td>
                          <td className={`px-5 py-3 text-right text-xs font-semibold ${ui.clase}`}>{ui.label}</td>
                          <td className="px-5 py-3 text-right text-xs text-slate-400">{d.resueltoEn ? fecha(d.resueltoEn) : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
