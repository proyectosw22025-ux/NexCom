"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt, Coins, UserPlus,
  BarChart3, Trophy, Star, Download,
} from "lucide-react";
import { ANALITICA_ADMIN } from "@/graphql/admin/queries";
import { PeriodoToolbar, descripcionRango, type RangoReporte } from "./analitica-ui";
import { exportarCSV } from "@/lib/csv-export";

// ── Tipos ───────────────────────────────────────────────────────────────────
interface Kpi { valor: string; delta: number }
interface SerieDia { fecha: string; ingresos: number; ordenes: number }
interface Segmento { etiqueta: string; valor: number; monto: string }
interface TopVend { nombreNegocio: string; ingresos: string; ventas: number; rating: string }
interface ComisionVend { nombre: string; ventas: number; bruto: string; comision: string; tasa: number }
interface Analitica {
  ingresos: Kpi; ordenes: Kpi; ticketPromedio: Kpi; comision: Kpi; usuariosNuevos: Kpi;
  serie: SerieDia[];
  porMetodoPago: Segmento[]; porEstado: Segmento[]; porCiudad: Segmento[];
  topVendedores: TopVend[];
  comisionPorVendedor: ComisionVend[];
}

// ── Utilidades de formato ────────────────────────────────────────────────────
const fmtBs = (v: string | number) =>
  "Bs. " + Number(v).toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = (v: string | number) => Number(v).toLocaleString("es-BO");
const fmtDia = (f: string) => {
  const [, m, d] = f.split("-");
  return `${d}/${m}`;
};

const METODO_LABEL: Record<string, string> = {
  qr: "QR Simple", transferencia: "Transferencia", contra_entrega: "Contra entrega",
  tarjeta: "Tarjeta (demo)", card: "Tarjeta",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente", PAGADO: "Pagado", EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado", ENTREGADO: "Entregado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
};
const DONUT_COLORS = ["#4f46e5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"];

// ── KPI scorecard ────────────────────────────────────────────────────────────
function KpiCard({ label, valor, delta, icon: Icon, money, index }:
  { label: string; valor: string; delta: number; icon: typeof DollarSign; money?: boolean; index: number }) {
  const positivo = delta >= 0;
  return (
    <div className="animate-stagger-fade-up hover-lift bg-white rounded-2xl border border-slate-200 p-4"
         style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-slate-300" />
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {money ? fmtBs(valor) : fmtNum(valor)}
      </p>
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${
        positivo ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      }`}>
        {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(delta)}% vs periodo previo
      </span>
    </div>
  );
}

// ── Lista ranqueada con barras (estado / ciudad) ─────────────────────────────
function BarrasRank({ titulo, icon: Icon, datos, formato }:
  { titulo: string; icon: typeof BarChart3; datos: Segmento[]; formato: "monto" | "valor" }) {
  const max = Math.max(1, ...datos.map((d) => (formato === "monto" ? Number(d.monto) : d.valor)));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-600" /> {titulo}
      </h3>
      {datos.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Sin datos en el periodo</p>
      ) : (
        <div className="space-y-2.5">
          {datos.map((d, i) => {
            const v = formato === "monto" ? Number(d.monto) : d.valor;
            const pct = (v / max) * 100;
            return (
              <div key={d.etiqueta + i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium truncate">{titulo.includes("estado") ? (ESTADO_LABEL[d.etiqueta] ?? d.etiqueta) : d.etiqueta}</span>
                  <span className="text-slate-900 font-semibold shrink-0">
                    {formato === "monto" ? fmtBs(d.monto) : fmtNum(d.valor)}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="animate-grow-x h-full rounded-full shadow-sm"
                    style={{
                      width: `${pct}%`,
                      backgroundImage: `linear-gradient(90deg, ${DONUT_COLORS[i % DONUT_COLORS.length]}, ${DONUT_COLORS[(i + 1) % DONUT_COLORS.length]})`,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Heatmap del valor de una celda (intensidad según el máximo) ──────────────
function heat(v: number, max: number, rgb = "79, 70, 229") {
  const t = max > 0 ? v / max : 0;
  const alpha = 0.08 + t * 0.55;
  return `rgba(${rgb}, ${alpha})`;
}

export default function AnaliticaDashboard() {
  const [rango, setRango] = useState<RangoReporte>({ dias: 30 });
  const { data, loading } = useQuery<{ analiticaAdmin: Analitica }>(ANALITICA_ADMIN, {
    variables: { ...rango }, fetchPolicy: "cache-and-network",
  });
  const a = data?.analiticaAdmin;

  const donutData = (a?.porMetodoPago ?? []).map((s) => ({ name: METODO_LABEL[s.etiqueta] ?? s.etiqueta, value: s.valor }));
  const maxIngVend = Math.max(1, ...(a?.topVendedores ?? []).map((v) => Number(v.ingresos)));

  return (
    <div className="animate-fade-in">
      {/* Toolbar: periodo (presets + rango de fechas) */}
      <PeriodoToolbar rango={rango} setRango={setRango} texto="Métricas de negocio y rendimiento" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard index={0} label="Ingresos (GMV)"   valor={a?.ingresos.valor ?? "0"}       delta={a?.ingresos.delta ?? 0}       icon={DollarSign} money />
        <KpiCard index={1} label="Órdenes pagadas"  valor={a?.ordenes.valor ?? "0"}        delta={a?.ordenes.delta ?? 0}        icon={ShoppingBag} />
        <KpiCard index={2} label="Ticket promedio"  valor={a?.ticketPromedio.valor ?? "0"} delta={a?.ticketPromedio.delta ?? 0} icon={Receipt} money />
        <KpiCard index={3} label="Comisión"         valor={a?.comision.valor ?? "0"}       delta={a?.comision.delta ?? 0}       icon={Coins} money />
        <KpiCard index={4} label="Usuarios nuevos"  valor={a?.usuariosNuevos.valor ?? "0"} delta={a?.usuariosNuevos.delta ?? 0} icon={UserPlus} />
      </div>

      {/* Serie temporal: ingresos + órdenes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-600" /> Ingresos y órdenes por día
        </h3>
        <p className="text-xs text-slate-400 mb-4">Evolución diaria {descripcionRango(rango)}</p>
        <div style={{ width: "100%", height: 280 }}>
          {loading && !a ? (
            <div className="h-full w-full skeleton rounded-xl" />
          ) : (
            <ResponsiveContainer>
              <ComposedChart data={a?.serie ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={fmtDia} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value, name) => name === "Ingresos" ? [fmtBs(value as number), name] : [fmtNum(value as number), name]}
                  labelFormatter={(l) => `Día ${fmtDia(String(l))}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left"  type="monotone" dataKey="ingresos" name="Ingresos" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gradIngresos)" dot={false} animationDuration={1100} animationEasing="ease-out" />
                <Line yAxisId="right" type="monotone" dataKey="ordenes"  name="Órdenes"  stroke="#10b981" strokeWidth={2.5} dot={false} animationDuration={1100} animationEasing="ease-out" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Donut método de pago */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" /> Método de pago
          </h3>
          {donutData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sin datos en el periodo</p>
          ) : (
            <>
              <div className="chart-3d-donut" style={{ width: "100%", height: 190 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                         innerRadius={46} outerRadius={74} paddingAngle={2} stroke="#fff" strokeWidth={2}
                         animationDuration={1000} animationEasing="ease-out">
                      {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [fmtNum(v as number), n]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-slate-900">{fmtNum(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Estado de órdenes */}
        <BarrasRank titulo="Órdenes por estado" icon={BarChart3} datos={a?.porEstado ?? []} formato="valor" />

        {/* Ventas por ciudad */}
        <BarrasRank titulo="Ingresos por ciudad" icon={BarChart3} datos={a?.porCiudad ?? []} formato="monto" />
      </div>

      {/* Top vendedores con heatmap */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 flex-1">Top vendedores por ingresos</h3>
          <button
            onClick={() => exportarCSV(
              `top-vendedores_${rango.dias ?? "rango"}.csv`,
              ["Tienda", "Ingresos (Bs.)", "Ventas", "Rating"],
              (a?.topVendedores ?? []).map((v) => [v.nombreNegocio, v.ingresos, v.ventas, v.rating]),
            )}
            disabled={(a?.topVendedores ?? []).length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600
                       disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
        {(a?.topVendedores ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Sin ventas en el periodo</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-2.5 font-semibold">#</th>
                <th className="px-5 py-2.5 font-semibold">Tienda</th>
                <th className="px-5 py-2.5 font-semibold text-right">Ingresos</th>
                <th className="px-5 py-2.5 font-semibold text-right">Ventas</th>
                <th className="px-5 py-2.5 font-semibold text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {(a?.topVendedores ?? []).map((v, i) => (
                <tr key={v.nombreNegocio + i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 font-semibold">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{v.nombreNegocio}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums"
                      style={{ backgroundColor: heat(Number(v.ingresos), maxIngVend) }}>
                    {fmtBs(v.ingresos)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{v.ventas}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-0.5 text-slate-700 font-semibold">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {v.rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Comisión ganada por tienda (ganancia real de la plataforma, desde el ledger) */}
      <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Coins className="h-4 w-4 text-emerald-600" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Comisión ganada por tienda</h3>
            <p className="text-xs text-slate-400">Lo que la plataforma ganó con cada vendedor {descripcionRango(rango)}</p>
          </div>
          <button
            onClick={() => exportarCSV(
              `comision-por-tienda_${rango.dias ?? "rango"}.csv`,
              ["Tienda", "Ventas", "Venta bruta (Bs.)", "Comisión ganada (Bs.)", "% efectivo"],
              (a?.comisionPorVendedor ?? []).map((c) => [c.nombre, c.ventas, c.bruto, c.comision, c.tasa]),
            )}
            disabled={(a?.comisionPorVendedor ?? []).length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-600
                       disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
        {(a?.comisionPorVendedor ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Sin comisiones registradas en el periodo</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-2.5 font-semibold">#</th>
                <th className="px-5 py-2.5 font-semibold">Tienda</th>
                <th className="px-5 py-2.5 font-semibold text-right">Ventas</th>
                <th className="px-5 py-2.5 font-semibold text-right">Venta bruta</th>
                <th className="px-5 py-2.5 font-semibold text-right">Comisión ganada</th>
                <th className="px-5 py-2.5 font-semibold text-right">% efectivo</th>
              </tr>
            </thead>
            <tbody>
              {(a?.comisionPorVendedor ?? []).map((c, i) => {
                const maxCom = Math.max(1, ...(a?.comisionPorVendedor ?? []).map((x) => Number(x.comision)));
                return (
                  <tr key={c.nombre + i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 font-semibold">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{c.nombre}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{c.ventas}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{fmtBs(c.bruto)}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums"
                        style={{ backgroundColor: heat(Number(c.comision), maxCom, "16, 185, 129") }}>
                      {fmtBs(c.comision)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 tabular-nums">{c.tasa}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
