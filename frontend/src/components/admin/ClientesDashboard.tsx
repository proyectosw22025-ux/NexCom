"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from "recharts";
import { Users, Receipt, UserPlus, Repeat, PieChart as PieIcon, BarChart3, Crown } from "lucide-react";
import { ANALITICA_CLIENTES } from "@/graphql/admin/queries";
import { KpiCard, Card, Donut3D, PeriodoToolbar, type RangoReporte, fmtBs, fmtNum, heat } from "./analitica-ui";

interface Kpi { valor: string; delta: number }
interface TopCli { nombre: string; ordenes: number; gasto: string; ticket: string }
interface Data {
  clientesActivos: Kpi; ticketPromedio: Kpi; nuevos: number; recurrentes: number;
  frecuencia: { f1: number; f2: number; f3: number; f4: number };
  topClientes: TopCli[];
}

const FREQ_COLORS = ["#0ea5e9", "#4f46e5", "#7c3aed", "#f59e0b"];

export default function ClientesDashboard() {
  const [rango, setRango] = useState<RangoReporte>({ dias: 30 });
  const { data, loading } = useQuery<{ analiticaClientes: Data }>(ANALITICA_CLIENTES, {
    variables: { ...rango }, fetchPolicy: "cache-and-network",
  });
  const a = data?.analiticaClientes;

  const segmentos = a ? [
    { name: "Nuevos", value: a.nuevos },
    { name: "Recurrentes", value: a.recurrentes },
  ] : [];
  const frecuencia = a ? [
    { label: "1 compra", value: a.frecuencia.f1 },
    { label: "2-3", value: a.frecuencia.f2 },
    { label: "4-5", value: a.frecuencia.f3 },
    { label: "6+", value: a.frecuencia.f4 },
  ] : [];
  const maxGasto = Math.max(1, ...(a?.topClientes ?? []).map((c) => Number(c.gasto)));

  return (
    <div className="animate-fade-in">
      <PeriodoToolbar rango={rango} setRango={setRango} texto="Comportamiento y fidelización de la base de compradores" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard index={0} label="Clientes activos" valor={a?.clientesActivos.valor ?? "0"} delta={a?.clientesActivos.delta ?? 0} icon={Users} />
        <KpiCard index={1} label="Ticket promedio" valor={a?.ticketPromedio.valor ?? "0"} delta={a?.ticketPromedio.delta ?? 0} icon={Receipt} money />
        <KpiCard index={2} label="Clientes nuevos" valor={String(a?.nuevos ?? 0)} icon={UserPlus} />
        <KpiCard index={3} label="Clientes recurrentes" valor={String(a?.recurrentes ?? 0)} icon={Repeat} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Nuevos vs recurrentes: dona 3D */}
        <Card titulo="Nuevos vs recurrentes" icon={PieIcon}>
          <Donut3D data={segmentos} colors={["#0ea5e9", "#4f46e5"]} />
        </Card>

        {/* Frecuencia de compra: histograma */}
        <Card titulo="Distribución por frecuencia de compra" icon={BarChart3} className="lg:col-span-2">
          {loading && !a ? <div className="h-64 skeleton rounded-xl" /> : frecuencia.every((f) => f.value === 0) ? (
            <p className="text-sm text-slate-400 py-16 text-center">Sin datos en el periodo</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={frecuencia} margin={{ top: 16, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v) => [fmtNum(v as number), "Clientes"]}
                           contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={56} animationDuration={1000} animationEasing="ease-out">
                    {frecuencia.map((_, i) => <Cell key={i} fill={FREQ_COLORS[i % FREQ_COLORS.length]} />)}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 12, fill: "#475569", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Nº de compras por cliente en el periodo — los segmentos a la derecha indican mayor fidelización.
          </p>
        </Card>
      </div>

      {/* Top clientes por gasto (LTV) con heatmap */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Top clientes por gasto (LTV del periodo)</h3>
        </div>
        {(a?.topClientes ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Sin clientes con compras en el periodo</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-2.5 font-semibold">#</th>
                <th className="px-5 py-2.5 font-semibold">Cliente</th>
                <th className="px-5 py-2.5 font-semibold text-right">Gasto total</th>
                <th className="px-5 py-2.5 font-semibold text-right">Órdenes</th>
                <th className="px-5 py-2.5 font-semibold text-right">Ticket promedio</th>
              </tr>
            </thead>
            <tbody>
              {(a?.topClientes ?? []).map((c, i) => (
                <tr key={c.nombre + i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 font-semibold">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{c.nombre}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums"
                      style={{ backgroundColor: heat(Number(c.gasto), maxGasto) }}>
                    {fmtBs(c.gasto)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{c.ordenes}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{fmtBs(c.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
