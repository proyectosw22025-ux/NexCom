"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from "recharts";
import { Boxes, Package, Coins, TrendingUp, AlertTriangle, PieChart as PieIcon, Trophy, Layers } from "lucide-react";
import { ANALITICA_PRODUCTOS } from "@/graphql/admin/queries";
import { KpiCard, Card, Donut3D, PeriodoToolbar, fmtBs, fmtNum, DONUT_COLORS } from "./analitica-ui";

interface Kpi { valor: string; delta: number }
interface Seg { etiqueta: string; valor: number; monto: string }
interface Top { nombre: string; vendedor: string; unidades: number; ingresos: string }
interface Data {
  unidades: Kpi; ingresos: Kpi; productosActivos: number; sinVentas: number;
  inventario: { enStock: number; bajo: number; agotado: number };
  topProductos: Top[]; porCategoria: Seg[];
}

const INV_COLORS = ["#10b981", "#f59e0b", "#f43f5e"]; // en stock / bajo / agotado

export default function ProductosDashboard() {
  const [dias, setDias] = useState(30);
  const { data, loading } = useQuery<{ analiticaProductos: Data }>(ANALITICA_PRODUCTOS, {
    variables: { dias }, fetchPolicy: "cache-and-network",
  });
  const a = data?.analiticaProductos;

  const topBars = (a?.topProductos ?? []).map((t) => ({
    nombre: t.nombre.length > 22 ? t.nombre.slice(0, 21) + "…" : t.nombre,
    ingresos: Number(t.ingresos), unidades: t.unidades, vendedor: t.vendedor,
  }));
  const invData = a ? [
    { name: "En stock", value: a.inventario.enStock },
    { name: "Stock bajo", value: a.inventario.bajo },
    { name: "Agotado", value: a.inventario.agotado },
  ] : [];
  const catIngresos = (a?.porCategoria ?? []).map((c) => ({ name: c.etiqueta, value: Number(c.monto) }));
  const catUnidades = (a?.porCategoria ?? []).map((c) => ({ etiqueta: c.etiqueta, valor: c.valor }));

  return (
    <div className="animate-fade-in">
      <PeriodoToolbar dias={dias} setDias={setDias} texto="Rendimiento del catálogo e inventario" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard index={0} label="Unidades vendidas" valor={a?.unidades.valor ?? "0"} delta={a?.unidades.delta ?? 0} icon={Boxes} />
        <KpiCard index={1} label="Ingresos por productos" valor={a?.ingresos.valor ?? "0"} delta={a?.ingresos.delta ?? 0} icon={Coins} money />
        <KpiCard index={2} label="Productos activos" valor={String(a?.productosActivos ?? 0)} icon={Package} />
        <KpiCard index={3} label="SKUs sin ventas" valor={String(a?.sinVentas ?? 0)} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top productos: barras horizontales */}
        <Card titulo="Top productos por ingresos" icon={Trophy} className="lg:col-span-2">
          {loading && !a ? <div className="h-72 skeleton rounded-xl" /> : topBars.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">Sin ventas en el periodo</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={topBars} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradTop" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(v) => [fmtBs(v as number), "Ingresos"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="ingresos" radius={[0, 8, 8, 0]} fill="url(#gradTop)" animationDuration={1000} animationEasing="ease-out" barSize={18}>
                    <LabelList dataKey="ingresos" position="right" formatter={(v) => fmtBs(Number(v))} style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Salud de inventario: dona 3D */}
        <Card titulo="Salud de inventario" icon={Boxes}>
          <Donut3D data={invData} colors={INV_COLORS} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card titulo="Ventas por categoría (ingresos)" icon={PieIcon}>
          <Donut3D data={catIngresos} money />
        </Card>

        <Card titulo="Unidades vendidas por categoría" icon={Layers}>
          {catUnidades.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">Sin datos en el periodo</p>
          ) : (
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={catUnidades} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v) => [fmtNum(v as number), "Unidades"]}
                           contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]} animationDuration={1000} animationEasing="ease-out">
                    {catUnidades.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
