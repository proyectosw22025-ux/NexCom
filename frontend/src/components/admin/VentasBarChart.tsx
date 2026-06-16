"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export interface VentaDiaData {
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
      <p className="text-slate-900 font-bold mt-0.5">Bs. {p.total.toFixed(2)}</p>
      <p className="text-slate-400">{p.ordenes} orden{p.ordenes !== 1 ? "es" : ""}</p>
    </div>
  );
}

export function VentasBarChart({ data, dias }: { data: VentaDiaData[]; dias: number }) {
  const puntos = useMemo<ChartPoint[]>(
    () => data.map((d) => ({
      fecha:   d.fecha,
      label:   formatLabel(d.fecha, dias),
      total:   parseFloat(d.total),
      ordenes: d.ordenes,
    })),
    [data, dias],
  );

  const maxTotal = useMemo(() => Math.max(...puntos.map((p) => p.total), 0), [puntos]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={puntos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} animationDuration={350}>
          {puntos.map((p) => (
            // Resalta el día con mayor ingreso del periodo
            <Cell key={p.fecha} fill={p.total === maxTotal && maxTotal > 0 ? "#4f46e5" : "#c7d2fe"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
