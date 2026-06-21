"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt, Coins, UserPlus,
  BarChart3, Trophy, Star,
} from "lucide-react";
import { ANALITICA_ADMIN } from "@/graphql/admin/queries";
import { PageHero } from "@/components/ui/PageHero";

// ── Tipos ───────────────────────────────────────────────────────────────────
interface Kpi { valor: string; delta: number }
interface SerieDia { fecha: string; ingresos: number; ordenes: number }
interface Segmento { etiqueta: string; valor: number; monto: string }
interface TopVend { nombreNegocio: string; ingresos: string; ventas: number; rating: string }
interface Analitica {
  ingresos: Kpi; ordenes: Kpi; ticketPromedio: Kpi; comision: Kpi; usuariosNuevos: Kpi;
  serie: SerieDia[];
  porMetodoPago: Segmento[]; porEstado: Segmento[]; porCiudad: Segmento[];
  topVendedores: TopVend[];
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

const PERIODOS = [
  { dias: 7,  label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

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
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
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
function heat(v: number, max: number) {
  const t = max > 0 ? v / max : 0;
  // de blanco a indigo según intensidad
  const alpha = 0.08 + t * 0.55;
  return `rgba(79, 70, 229, ${alpha})`;
}

export default function AnaliticaDashboard() {
  const [dias, setDias] = useState(30);
  const { data, loading } = useQuery<{ analiticaAdmin: Analitica }>(ANALITICA_ADMIN, {
    variables: { dias }, fetchPolicy: "cache-and-network",
  });
  const a = data?.analiticaAdmin;

  const donutData = (a?.porMetodoPago ?? []).map((s) => ({ name: METODO_LABEL[s.etiqueta] ?? s.etiqueta, value: s.valor }));
  const maxIngVend = Math.max(1, ...(a?.topVendedores ?? []).map((v) => Number(v.ingresos)));

  return (
    <div className="p-8">
      <PageHero
        titulo="Analítica de la plataforma"
        subtitulo="Métricas de negocio, tendencias y rendimiento de NexCom"
        icon={BarChart3}
        tono="slate"
        acciones={
          <div className="inline-flex bg-white/15 rounded-xl p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                onClick={() => setDias(p.dias)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  dias === p.dias ? "bg-white text-slate-800" : "text-white/80 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

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
        <p className="text-xs text-slate-400 mb-4">Evolución diaria en los últimos {dias} días</p>
        <div style={{ width: "100%", height: 280 }}>
          {loading && !a ? (
            <div className="h-full w-full skeleton rounded-xl" />
          ) : (
            <ResponsiveContainer>
              <ComposedChart data={a?.serie ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                <Line yAxisId="left"  type="monotone" dataKey="ingresos" name="Ingresos" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="ordenes"  name="Órdenes"  stroke="#10b981" strokeWidth={2.5} dot={false} />
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
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
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
          <h3 className="text-sm font-bold text-slate-900">Top vendedores por ingresos</h3>
        </div>
        {(a?.topVendedores ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Sin ventas en el periodo</p>
        ) : (
          <table className="w-full text-sm">
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
          </table>
        )}
      </div>
    </div>
  );
}
