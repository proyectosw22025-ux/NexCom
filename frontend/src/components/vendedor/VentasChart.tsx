"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { VENTAS_VENDEDOR_POR_DIA } from "@/graphql/ordenes/queries";

interface VentaDia {
  fecha:   string;
  total:   string;
  ordenes: number;
}

interface ChartPoint {
  fecha:   string;
  label:   string;
  total:   number;
  ordenes: number;
}

const RANGOS = [
  { dias: 7,  label: "7 días" },
  { dias: 30, label: "30 días" },
] as const;

function formatLabel(fechaISO: string, rango: number): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  if (rango <= 7) return d.toLocaleDateString("es-BO", { weekday: "short", day: "numeric" });
  return d.toLocaleDateString("es-BO", { day: "numeric", month: "short" });
}

interface TooltipPayloadItem { payload: ChartPoint }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 capitalize">{p.label}</p>
      <p className="text-indigo-600 font-bold mt-0.5">Bs. {p.total.toFixed(2)}</p>
      <p className="text-slate-400">{p.ordenes} orden{p.ordenes !== 1 ? "es" : ""}</p>
    </div>
  );
}

export function VentasChart() {
  const [rango, setRango]     = useState<number>(7);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, loading } = useQuery<{ ventasVendedorPorDia: VentaDia[] }>(
    VENTAS_VENDEDOR_POR_DIA,
    { variables: { dias: rango }, fetchPolicy: "cache-and-network" },
  );

  const puntos = useMemo<ChartPoint[]>(() => {
    const serie = data?.ventasVendedorPorDia ?? [];
    return serie.map((d) => ({
      fecha:   d.fecha,
      label:   formatLabel(d.fecha, rango),
      total:   parseFloat(d.total),
      ordenes: d.ordenes,
    }));
  }, [data, rango]);

  const totalRango = useMemo(
    () => puntos.reduce((acc, p) => acc + p.total, 0),
    [puntos],
  );
  const ordenesRango = useMemo(
    () => puntos.reduce((acc, p) => acc + p.ordenes, 0),
    [puntos],
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Ventas
          </h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">Bs. {totalRango.toFixed(2)}</p>
          <p className="text-xs text-slate-400">
            {ordenesRango} orden{ordenesRango !== 1 ? "es" : ""} en los últimos {rango} días
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {RANGOS.map((r) => (
            <button
              key={r.dias}
              onClick={() => setRango(r.dias)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                rango === r.dias ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 w-full">
        {!mounted || (loading && !data) ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            <p className="text-xs text-slate-400">Cargando ventas…</p>
          </div>
        ) : totalRango === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-500">Aún no hay ventas en este periodo</p>
            <p className="text-xs text-slate-400">Tus ventas aparecerán aquí en cuanto recibas órdenes pagadas</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={puntos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c7d2fe", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#ventasGradient)"
                animationDuration={350}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
