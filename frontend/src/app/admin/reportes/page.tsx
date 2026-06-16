"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { LISTAR_REPORTES } from "@/graphql/admin/queries";
import { Badge } from "@/components/ui/Badge";
import { FilterPills } from "@/components/ui/FilterPills";
import { BarChart2, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Reporte {
  id: string; tipo: string; referenciaId: string; motivo: string;
  descripcion: string | null; estado: string;
  creadoEn: string; resueltoEn: string | null;
  reportador:  { id: string; email: string };
  resueltoPor: { id: string; email: string } | null;
}

type EstadoFilter = "TODOS" | "PENDIENTE" | "REVISANDO" | "RESUELTO" | "RECHAZADO";
type TipoFilter   = "TODOS" | "PRODUCTO" | "VENDEDOR" | "VALORACION" | "OFERTA" | "MENSAJE";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const estadoBadge: Record<string, "pendiente" | "activo" | "inactivo" | "enviado" | "cancelado"> = {
  PENDIENTE:  "pendiente",
  REVISANDO:  "enviado",
  RESUELTO:   "activo",
  RECHAZADO:  "cancelado",
};

export default function AdminReportesPage() {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFilter>("TODOS");
  const [tipoFiltro,   setTipoFiltro]   = useState<TipoFilter>("TODOS");
  const [pagina, setPagina] = useState(1);

  const { data, loading } = useQuery<{
    reportes: { items: Reporte[]; total: number; totalPaginas: number }
  }>(LISTAR_REPORTES, {
    variables: {
      estado:  estadoFiltro !== "TODOS" ? estadoFiltro : undefined,
      tipo:    tipoFiltro   !== "TODOS" ? tipoFiltro   : undefined,
      pagina,
      limite:  20,
    },
    fetchPolicy: "cache-and-network",
  });

  const reportes     = data?.reportes?.items ?? [];
  const total        = data?.reportes?.total ?? 0;
  const totalPaginas = data?.reportes?.totalPaginas ?? 1;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reportes de moderación</h1>
        <p className="text-sm text-slate-400 mt-0.5">{total} reporte{total !== 1 ? "s" : ""} en total</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <FilterPills
          ariaLabel="Filtrar por estado"
          accent="slate"
          value={estadoFiltro}
          onChange={(e) => { setEstadoFiltro(e); setPagina(1); }}
          options={(["TODOS", "PENDIENTE", "REVISANDO", "RESUELTO", "RECHAZADO"] as EstadoFilter[]).map((e) => ({
            value: e,
            label: e === "TODOS" ? "Todos" : e.charAt(0) + e.slice(1).toLowerCase(),
          }))}
        />
        <FilterPills
          ariaLabel="Filtrar por tipo"
          accent="indigo"
          value={tipoFiltro}
          onChange={(t) => { setTipoFiltro(t); setPagina(1); }}
          options={(["TODOS", "PRODUCTO", "VENDEDOR", "VALORACION"] as TipoFilter[]).map((t) => ({
            value: t,
            label: t === "TODOS" ? "Tipo: todos" : t.charAt(0) + t.slice(1).toLowerCase(),
          }))}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando reportes…</p>
        </div>
      ) : reportes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <BarChart2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Sin reportes</p>
          <p className="text-sm text-slate-400 mt-1">No hay reportes con esos filtros</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Motivo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reportado por</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportes.map((r, i) => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900 line-clamp-1">{r.motivo}</p>
                    {r.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.descripcion}</p>}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{r.reportador.email}</td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={estadoBadge[r.estado] ?? "inactivo"} size="sm" label={r.estado.charAt(0) + r.estado.slice(1).toLowerCase()} />
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400">{formatFecha(r.creadoEn)}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/reportes/${r.id}`}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center"
                    >
                      <ChevronRight className="h-4 w-4 text-indigo-500" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Página {pagina} de {totalPaginas} · {total} reportes</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
