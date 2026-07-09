"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { BadgeCheck, Loader2, CheckCircle2, XCircle, MapPin, Mail, Phone, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { VERIFICACIONES_PENDIENTES, RESOLVER_VERIFICACION } from "@/graphql/verificacion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHero } from "@/components/ui/PageHero";

interface Pendiente {
  id: string; nombreNegocio: string; ciudad: string; email: string;
  telefono: string | null; documentoUrl: string | null; documentoTipo: string | null; enviadaEn: string | null;
}

function fecha(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default function AdminVerificacionesPage() {
  const { data, loading, refetch } = useQuery<{ verificacionesPendientes: Pendiente[] }>(
    VERIFICACIONES_PENDIENTES, { fetchPolicy: "cache-and-network" },
  );
  const [resolver, { loading: resolviendo }] = useMutation(RESOLVER_VERIFICACION);
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const pendientes = data?.verificacionesPendientes ?? [];

  async function handleResolver(id: string, aprobar: boolean) {
    try {
      await resolver({ variables: { vendedorId: id, aprobar, notas: aprobar ? null : (motivos[id] || null) } });
      toast.success(aprobar ? "Vendedor verificado." : "Verificación rechazada.");
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHero
        titulo="Verificaciones"
        subtitulo="Revisa la identidad de los vendedores que solicitaron el sello de confianza (KYC)"
        icon={BadgeCheck}
        tono="slate"
      />

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando…</p>
        </div>
      ) : pendientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <BadgeCheck className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 mb-1">Sin verificaciones pendientes</p>
          <p className="text-sm text-slate-400">Cuando un vendedor envíe su documento, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendientes.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col md:flex-row gap-5">
                {/* Documento */}
                <a
                  href={v.documentoUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="relative w-full md:w-48 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 group"
                >
                  {v.documentoUrl ? (
                    <>
                      <Image src={v.documentoUrl} alt={`Documento de ${v.nombreNegocio}`} fill className="object-cover" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300"><FileText className="h-8 w-8" /></div>
                  )}
                </a>

                {/* Datos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{v.nombreNegocio}</h3>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v.documentoTipo ?? "—"}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-300" /> {v.email}</p>
                    {v.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-300" /> {v.telefono}</p>}
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-300" /> {v.ciudad}</p>
                    <p className="text-slate-400">Enviado el {fecha(v.enviadaEn)}</p>
                  </div>

                  <input
                    value={motivos[v.id] ?? ""}
                    onChange={(e) => setMotivos((m) => ({ ...m, [v.id]: e.target.value }))}
                    placeholder="Motivo de rechazo (opcional)"
                    className="mt-3 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />

                  <div className="flex items-center gap-2 mt-3">
                    <ConfirmDialog
                      title="Aprobar verificación"
                      description={`¿Verificar a "${v.nombreNegocio}"? Podrá retirar fondos y lucirá el sello de confianza.`}
                      confirmLabel="Aprobar"
                      onConfirm={() => handleResolver(v.id, true)}
                      trigger={
                        <button disabled={resolviendo} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                        </button>
                      }
                    />
                    <ConfirmDialog
                      title="Rechazar verificación"
                      description={`¿Rechazar la verificación de "${v.nombreNegocio}"? El vendedor podrá volver a enviarla.`}
                      confirmLabel="Rechazar"
                      variant="danger"
                      onConfirm={() => handleResolver(v.id, false)}
                      trigger={
                        <button disabled={resolviendo} className="flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-500 text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
                          <XCircle className="h-3.5 w-3.5" /> Rechazar
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
