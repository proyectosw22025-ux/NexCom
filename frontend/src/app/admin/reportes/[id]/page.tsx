"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { LISTAR_REPORTES } from "@/graphql/admin/queries";
import { RESOLVER_REPORTE } from "@/graphql/admin/mutations";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, BarChart2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import { useState } from "react";

interface Reporte {
  id: string; tipo: string; referenciaId: string; motivo: string;
  descripcion: string | null; estado: string; resolucion: string | null;
  creadoEn: string; resueltoEn: string | null;
  reportador:  { id: string; email: string };
  resueltoPor: { id: string; email: string } | null;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const estadoBadge: Record<string, "pendiente" | "activo" | "inactivo" | "enviado" | "cancelado"> = {
  PENDIENTE: "pendiente",
  REVISANDO: "enviado",
  RESUELTO:  "activo",
  RECHAZADO: "cancelado",
};

export default function AdminReporteDetallePage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [resolucion, setResolucion] = useState("");

  const { data, loading, refetch } = useQuery<{
    reportes: { items: Reporte[] }
  }>(LISTAR_REPORTES, {
    variables: { pagina: 1, limite: 100 },
    fetchPolicy: "cache-and-network",
  });

  const [resolverReporte, { loading: resolving }] = useMutation(RESOLVER_REPORTE);

  const reporte = data?.reportes?.items?.find(r => r.id === id);

  async function handleResolver(estado: "RESUELTO" | "RECHAZADO") {
    if (!resolucion.trim()) {
      toast.error("Escribe una resolución antes de continuar.");
      return;
    }
    if (!confirm(`¿${estado === "RESUELTO" ? "Resolver" : "Rechazar"} este reporte?`)) return;
    try {
      await resolverReporte({ variables: { id, estado, resolucion: resolucion.trim() } });
      toast.success(estado === "RESUELTO" ? "Reporte resuelto." : "Reporte rechazado.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="text-sm text-slate-400">Cargando reporte…</p>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="p-8 text-center">
        <BarChart2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">Reporte no encontrado</p>
        <button onClick={() => router.back()} className="text-indigo-600 hover:underline text-sm mt-2">
          ← Volver
        </button>
      </div>
    );
  }

  const estaResuelto = reporte.estado === "RESUELTO" || reporte.estado === "RECHAZADO";

  return (
    <div className="p-8 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a reportes
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reporte de {reporte.tipo.toLowerCase()}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{reporte.id}</p>
        </div>
        <Badge
          variant={estadoBadge[reporte.estado] ?? "inactivo"}
          label={reporte.estado.charAt(0) + reporte.estado.slice(1).toLowerCase()}
        />
      </div>

      {/* Detalles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Tipo</p>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{reporte.tipo}</span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ID referenciado</p>
            <p className="text-xs font-mono text-slate-700 truncate">{reporte.referenciaId}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Reportado por</p>
            <p className="text-sm font-medium text-slate-900">{reporte.reportador.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Fecha</p>
            <p className="text-sm text-slate-700">{formatFecha(reporte.creadoEn)}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Motivo</p>
          <p className="text-sm font-semibold text-slate-900">{reporte.motivo}</p>
        </div>

        {reporte.descripcion && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Descripción</p>
            <p className="text-sm text-slate-700 leading-relaxed">{reporte.descripcion}</p>
          </div>
        )}
      </div>

      {/* Resolución previa */}
      {estaResuelto && (
        <div className={`rounded-2xl border p-5 mb-4 ${
          reporte.estado === "RESUELTO"
            ? "bg-emerald-50 border-emerald-200"
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {reporte.estado === "RESUELTO"
              ? <CheckCircle className="h-4 w-4 text-emerald-600" />
              : <XCircle     className="h-4 w-4 text-red-500" />
            }
            <p className={`text-sm font-semibold ${reporte.estado === "RESUELTO" ? "text-emerald-700" : "text-red-600"}`}>
              {reporte.estado === "RESUELTO" ? "Resuelto" : "Rechazado"}
              {reporte.resueltoPor && ` por ${reporte.resueltoPor.email}`}
              {reporte.resueltoEn && ` · ${formatFecha(reporte.resueltoEn)}`}
            </p>
          </div>
          {reporte.resolucion && (
            <p className="text-sm text-slate-700">{reporte.resolucion}</p>
          )}
        </div>
      )}

      {/* Acciones de moderación */}
      {!estaResuelto && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Acción de moderación</h2>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Resolución / Notas
            </label>
            <textarea
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value)}
              rows={3}
              placeholder="Describe la acción tomada o el motivo del rechazo…"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                         text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2
                         focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleResolver("RESUELTO")}
              disabled={resolving || !resolucion.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                         text-white font-semibold rounded-xl py-2.5 text-sm transition-colors
                         shadow-sm shadow-emerald-200 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Resolver
            </button>
            <button
              onClick={() => handleResolver("RECHAZADO")}
              disabled={resolving || !resolucion.trim()}
              className="flex-1 flex items-center justify-center gap-2 border border-red-200
                         text-red-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-red-50
                         transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Rechazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
