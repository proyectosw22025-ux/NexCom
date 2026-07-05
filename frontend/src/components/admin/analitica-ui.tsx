"use client";

import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, CalendarRange } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Formato ──────────────────────────────────────────────────────────────────
export const fmtBs = (v: string | number) =>
  "Bs. " + Number(v).toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmtNum = (v: string | number) => Number(v).toLocaleString("es-BO");

export const DONUT_COLORS = ["#4f46e5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"];

// ── Selector de periodo (presets + rango de fechas personalizado) ────────────
/** Periodo del reporte: preset de días O rango [desde, hasta] (YYYY-MM-DD). */
export interface RangoReporte { dias?: number; desde?: string; hasta?: string }

const PERIODOS = [
  { dias: 7, label: "7 días" }, { dias: 30, label: "30 días" }, { dias: 90, label: "90 días" },
];

const fmtDiaCorto = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });

/** Texto legible del periodo activo ("últimos 30 días" / "del 01 jun al 15 jun"). */
export function descripcionRango(r: RangoReporte): string {
  return r.desde && r.hasta
    ? `del ${fmtDiaCorto(r.desde)} al ${fmtDiaCorto(r.hasta)}`
    : `últimos ${r.dias ?? 30} días`;
}

export function PeriodoToolbar({ rango, setRango, texto }:
  { rango: RangoReporte; setRango: (r: RangoReporte) => void; texto: string }) {
  const [abierto, setAbierto] = useState(false);       // panel de fechas visible
  const [desde, setDesde] = useState(rango.desde ?? "");
  const [hasta, setHasta] = useState(rango.hasta ?? "");
  const hoy = new Date().toISOString().slice(0, 10);
  const rangoValido = !!desde && !!hasta && desde <= hasta;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">{texto} · {descripcionRango(rango)}</p>
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          {PERIODOS.map((p) => (
            <button key={p.dias} onClick={() => { setAbierto(false); setRango({ dias: p.dias }); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !rango.desde && rango.dias === p.dias ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setAbierto((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              rango.desde ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}>
            <CalendarRange className="h-3.5 w-3.5" /> Fechas
          </button>
        </div>
      </div>

      {abierto && (
        <div className="animate-scale-in origin-top-right mt-3 flex items-end justify-end gap-2 flex-wrap">
          <label className="text-xs text-slate-500">
            Desde
            <input type="date" value={desde} max={hasta || hoy} onChange={(e) => setDesde(e.target.value)}
              className="block mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </label>
          <label className="text-xs text-slate-500">
            Hasta
            <input type="date" value={hasta} min={desde} max={hoy} onChange={(e) => setHasta(e.target.value)}
              className="block mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </label>
          <button
            onClick={() => { if (rangoValido) { setRango({ desde, hasta }); setAbierto(false); } }}
            disabled={!rangoValido}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white
                       text-xs font-semibold rounded-xl transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

// ── KPI scorecard con delta ──────────────────────────────────────────────────
export function KpiCard({ label, valor, delta, icon: Icon, money, suffix, index }:
  { label: string; valor: string; delta?: number; icon: LucideIcon; money?: boolean; suffix?: string; index: number }) {
  const positivo = (delta ?? 0) >= 0;
  return (
    <div className="animate-stagger-fade-up hover-lift bg-white rounded-2xl border border-slate-200 p-4"
         style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-slate-300" />
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {money ? fmtBs(valor) : fmtNum(valor)}{suffix}
      </p>
      {delta !== undefined && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${
          positivo ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        }`}>
          {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(delta)}% vs periodo previo
        </span>
      )}
    </div>
  );
}

// ── Tarjeta contenedora ──────────────────────────────────────────────────────
export function Card({ titulo, icon: Icon, children, className = "" }:
  { titulo: string; icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-600" /> {titulo}
      </h3>
      {children}
    </div>
  );
}

// ── Dona 3D (inclinada + sombra) con leyenda ─────────────────────────────────
export function Donut3D({ data, colors = DONUT_COLORS, money }:
  { data: { name: string; value: number }[]; colors?: string[]; money?: boolean }) {
  if (data.length === 0 || data.every((d) => d.value === 0))
    return <p className="text-sm text-slate-400 py-12 text-center">Sin datos en el periodo</p>;
  return (
    <>
      <div className="chart-3d-donut" style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={46} outerRadius={74} paddingAngle={2} stroke="#fff" strokeWidth={2}
                 animationDuration={1000} animationEasing="ease-out">
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [money ? fmtBs(v as number) : fmtNum(v as number), ""]}
                     contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              {d.name}
            </span>
            <span className="font-semibold text-slate-900">{money ? fmtBs(d.value) : fmtNum(d.value)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Heatmap de intensidad (celdas de tabla) ──────────────────────────────────
export function heat(v: number, max: number, rgb = "79, 70, 229") {
  const t = max > 0 ? v / max : 0;
  return `rgba(${rgb}, ${0.08 + t * 0.55})`;
}
