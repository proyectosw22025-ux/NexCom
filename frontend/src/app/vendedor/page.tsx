"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { MIS_PRODUCTOS } from "@/graphql/productos/queries";
import { ORDENES_VENDEDOR } from "@/graphql/ordenes/queries";
import {
  Package, TrendingUp, Star, Plus, Loader2, Eye, EyeOff, Store, Truck,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/Badge";
import { PageHero } from "@/components/ui/PageHero";
import { StatCard } from "@/components/ui/StatCard";
import { OnboardingVendedor } from "@/components/vendedor/OnboardingVendedor";
import { NivelTiendaCard } from "@/components/vendedor/NivelTiendaCard";
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

interface OrdenPendienteEnvio {
  id: string; estado: string; creadoEn: string;
  comprador: { nombreCompleto: string } | null;
}

// Días máximos que tiene el vendedor para enviar antes de la cancelación
// automática (debe coincidir con DIAS_CANCELACION_SIN_ENVIO en el backend).
const DIAS_LIMITE_ENVIO = 7;

function diasRestantesEnvio(creadoEn: string) {
  const vencimiento = new Date(creadoEn).getTime() + DIAS_LIMITE_ENVIO * 86_400_000;
  return Math.ceil((vencimiento - Date.now()) / 86_400_000);
}

export default function VendedorDashboard() {
  const { user } = useAuth();
  const { data, loading } = useQuery<{ misProductos: ProductoConVentas[] }>(MIS_PRODUCTOS, {
    fetchPolicy: "cache-and-network",
  });
  const { data: dataOrdenes } = useQuery<{ ordenesVendedor: OrdenPendienteEnvio[] }>(ORDENES_VENDEDOR, {
    fetchPolicy: "cache-and-network",
  });

  const productos    = data?.misProductos ?? [];
  const activos      = productos.filter((p) => p.activo).length;
  const destacados   = productos.filter((p) => p.destacado).length;
  const sinStock     = productos.filter((p) => p.stock === 0).length;
  const totalVendido = productos.reduce((acc, p) => acc + p.totalVendido, 0);

  const porEnviar = (dataOrdenes?.ordenesVendedor ?? [])
    .filter((o) => o.estado === "PAGADO" || o.estado === "EN_PREPARACION")
    .map((o) => ({ ...o, dias: diasRestantesEnvio(o.creadoEn) }))
    .sort((a, b) => a.dias - b.dias);

  return (
    <div className="p-8">
      <PageHero
        titulo={`Hola, ${user?.perfilVendedor?.nombreNegocio ?? "vendedor"} 🚀`}
        subtitulo="Resumen y rendimiento de tu tienda"
        icon={Store}
        tono="violet"
      />

      {/* Nivel de confianza / KYC — empuja a verificarse mostrando beneficios */}
      <NivelTiendaCard />

      {/* Onboarding para vendedores nuevos (se oculta al completarse) */}
      {!loading && (
        <OnboardingVendedor totalProductos={productos.length} destacados={destacados} />
      )}

      {/* Urgencia: pedidos por enviar antes de la cancelación automática (7 días) */}
      {porEnviar.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Por enviar</h2>
            <span className="text-xs text-slate-500">
              · {porEnviar.length} pedido{porEnviar.length !== 1 ? "s" : ""} esperando envío
            </span>
          </div>
          <div className="space-y-2">
            {porEnviar.slice(0, 4).map((o) => {
              const urgente = o.dias <= 2;
              return (
                <Link
                  key={o.id}
                  href={`/vendedor/ordenes/${o.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white
                             border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {o.comprador?.nombreCompleto ?? "Comprador"}
                    </p>
                    <p className="text-xs text-slate-400">Orden #{o.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                    urgente ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {o.dias <= 0 ? "Vence hoy" : `Vence en ${o.dias} día${o.dias !== 1 ? "s" : ""}`}
                  </span>
                </Link>
              );
            })}
          </div>
          {porEnviar.length > 4 && (
            <Link href="/vendedor/ordenes" className="inline-block mt-3 text-xs font-semibold text-indigo-600 hover:underline">
              Ver todos ({porEnviar.length}) →
            </Link>
          )}
        </div>
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
