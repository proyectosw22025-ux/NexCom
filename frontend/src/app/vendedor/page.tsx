"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { MIS_PRODUCTOS } from "@/graphql/productos/queries";
import {
  Package, TrendingUp, Star, Plus, Loader2, Eye, EyeOff, Store,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/Badge";
import { PageHero } from "@/components/ui/PageHero";
import { StatCard } from "@/components/ui/StatCard";
import { OnboardingVendedor } from "@/components/vendedor/OnboardingVendedor";
import type { ProductoCardData } from "@/components/productos/ProductoCard";

// Code-split: recharts (~70kB) solo se descarga al montar el dashboard del
// vendedor, no en el bundle inicial. Mejora el tiempo de carga percibido.
const VentasChart = dynamic(
  () => import("@/components/vendedor/VentasChart").then((m) => m.VentasChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8 h-[332px] animate-pulse" />
    ),
  },
);

interface ProductoConVentas extends ProductoCardData {
  totalVendido: number;
}

export default function VendedorDashboard() {
  const { user } = useAuth();
  const { data, loading } = useQuery<{ misProductos: ProductoConVentas[] }>(MIS_PRODUCTOS, {
    fetchPolicy: "cache-and-network",
  });

  const productos    = data?.misProductos ?? [];
  const activos      = productos.filter((p) => p.activo).length;
  const destacados   = productos.filter((p) => p.destacado).length;
  const sinStock     = productos.filter((p) => p.stock === 0).length;
  const totalVendido = productos.reduce((acc, p) => acc + p.totalVendido, 0);

  return (
    <div className="p-8">
      <PageHero
        titulo={`Hola, ${user?.perfilVendedor?.nombreNegocio ?? "vendedor"} 🚀`}
        subtitulo="Resumen y rendimiento de tu tienda"
        icon={Store}
        tono="violet"
      />

      {/* Onboarding para vendedores nuevos (se oculta al completarse) */}
      {!loading && (
        <OnboardingVendedor totalProductos={productos.length} destacados={destacados} />
      )}

      {/* Gráfico de ventas */}
      <VentasChart />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard index={0} loading={loading} label="Productos activos" value={activos} icon={Package} accent="violet"
          hint={sinStock > 0 ? `${sinStock} sin stock` : undefined} />
        <StatCard index={1} loading={loading} label="Destacados" value={destacados} icon={Star} accent="amber" />
        <StatCard index={2} loading={loading} label="Total vendido" value={totalVendido} icon={TrendingUp} accent="emerald" />
      </div>

      {/* Products list */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Mis productos</h2>
          <Link
            href="/vendedor/productos/nuevo"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs
                       font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            <p className="text-xs text-slate-400">Cargando productos…</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">Aún no tienes productos</p>
            <Link
              href="/vendedor/productos/nuevo"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold
                         px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Crear primer producto
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {productos.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <Badge variant={p.activo ? "activo" : "inactivo"} size="sm" dot />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{p.categoria.nombre} · stock: {p.stock}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">Bs. {p.precio}</span>
                  {p.activo ? <Eye className="h-4 w-4 text-slate-400" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
                  <Link href={`/vendedor/productos/${p.id}/editar`} className="text-xs text-indigo-600 hover:underline font-medium">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {productos.length > 8 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <Link href="/vendedor/productos" className="text-sm text-indigo-600 hover:underline font-medium">
              Ver todos ({productos.length}) →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
