"use client";

import { useQuery } from "@apollo/client";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { METRICAS_RENDIMIENTO } from "@/graphql/admin/queries";

interface MetricaOperacion {
  operacion: string; count: number; errores: number;
  promedioMs: number; p50: number; p95: number; p99: number;
}
interface Metricas { uptimeSegundos: number; operaciones: MetricaOperacion[] }

function formatUptime(seg: number): string {
  if (seg < 60) return `${seg}s`;
  if (seg < 3600) return `${Math.floor(seg / 60)}m`;
  return `${Math.floor(seg / 3600)}h ${Math.floor((seg % 3600) / 60)}m`;
}

// Umbral de salud según P95 (SLO objetivo: P95 < 3s; verde < 1s)
function colorP95(ms: number): string {
  if (ms < 1000) return "text-emerald-600";
  if (ms < 3000) return "text-amber-600";
  return "text-red-600";
}

export function PanelRendimiento() {
  const { data, loading, refetch } = useQuery<{ metricasRendimiento: Metricas }>(
    METRICAS_RENDIMIENTO, { fetchPolicy: "cache-and-network" },
  );

  const m = data?.metricasRendimiento;
  const ops = m?.operaciones ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Rendimiento del sistema</h2>
          {m && (
            <span className="text-xs text-slate-400">· uptime {formatUptime(m.uptimeSegundos)}</span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          <p className="text-xs text-slate-400">Cargando métricas…</p>
        </div>
      ) : ops.length === 0 ? (
        <div className="text-center py-10">
          <Activity className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aún sin tráfico registrado en esta instancia</p>
          <p className="text-xs text-slate-400 mt-0.5">Las métricas se acumulan desde el último arranque del backend</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-semibold">Operación</th>
                <th className="px-3 py-3 text-right font-semibold">Llamadas</th>
                <th className="px-3 py-3 text-right font-semibold">Prom.</th>
                <th className="px-3 py-3 text-right font-semibold">P50</th>
                <th className="px-3 py-3 text-right font-semibold">P95</th>
                <th className="px-3 py-3 text-right font-semibold">P99</th>
                <th className="px-5 py-3 text-right font-semibold">Errores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ops.map((o) => (
                <tr key={o.operacion} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-700">{o.operacion}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{o.count}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{o.promedioMs} ms</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{o.p50} ms</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${colorP95(o.p95)}`}>{o.p95} ms</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{o.p99} ms</td>
                  <td className={`px-5 py-2.5 text-right ${o.errores > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                    {o.errores}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
