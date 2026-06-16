"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@apollo/client";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { Users, Package, ShoppingBag, Star, ChevronRight, Loader2, TrendingUp, ShieldAlert } from "lucide-react";
import { LISTAR_USUARIOS, TODOS_PRODUCTOS, ESTADISTICAS_ADMIN } from "@/graphql/admin/queries";
import { Badge } from "@/components/ui/Badge";

// Code-split: recharts solo se descarga al montar el dashboard admin.
const VentasBarChart = dynamic(
  () => import("@/components/admin/VentasBarChart").then((m) => m.VentasBarChart),
  {
    ssr: false,
    loading: () => <div className="h-56 rounded-xl bg-slate-50 animate-pulse" />,
  },
);

interface UsuarioAdmin {
  id: string; email: string; rol: string; verificado: boolean; activo: boolean; creadoEn: string;
  perfilVendedor:  { nombreNegocio: string } | null;
  perfilComprador: { nombreCompleto: string } | null;
}
interface ProductoAdmin {
  id: string; nombre: string; precio: string; stock: number; activo: boolean; destacado: boolean; creadoEn: string;
  vendedor: { nombreNegocio: string };
}
interface VentaDia { fecha: string; total: string; ordenes: number }
interface EstadisticasAdmin {
  ventasPorDia: VentaDia[]; reportesPendientes: number; ingresosPeriodo: string; ordenesPeriodo: number;
}

const RANGOS = [
  { dias: 7,  label: "7 días" },
  { dias: 30, label: "30 días" },
] as const;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const { user } = useAuth();
  const [dias, setDias] = useState<number>(7);

  const { data: statsData, loading: loadingS } = useQuery<{ estadisticasAdmin: EstadisticasAdmin }>(
    ESTADISTICAS_ADMIN, { variables: { dias }, fetchPolicy: "cache-and-network" },
  );

  const { data: usuariosData, loading: loadingU } = useQuery<{
    listarUsuarios: { items: UsuarioAdmin[]; total: number }
  }>(LISTAR_USUARIOS, { variables: { pagina: 1, limite: 100 }, fetchPolicy: "cache-and-network" });

  const { data: productosData, loading: loadingP } = useQuery<{
    productos: { items: ProductoAdmin[]; total: number }
  }>(TODOS_PRODUCTOS, { variables: { pagina: 1, limite: 5, soloActivos: false }, fetchPolicy: "cache-and-network" });

  const { data: productosActivosData } = useQuery<{ productos: { total: number } }>(
    TODOS_PRODUCTOS, { variables: { pagina: 1, limite: 1, soloActivos: true }, fetchPolicy: "cache-and-network" },
  );

  const estadisticas  = statsData?.estadisticasAdmin;
  const reportesPend  = estadisticas?.reportesPendientes ?? 0;

  const usuarios  = usuariosData?.listarUsuarios?.items ?? [];
  const totalUsuarios = usuariosData?.listarUsuarios?.total ?? 0;
  const productos = productosData?.productos?.items ?? [];
  const totalProductos        = productosData?.productos?.total ?? 0;
  const totalProductosActivos = productosActivosData?.productos?.total ?? 0;

  const totalVendedores   = usuarios.filter(u => u.rol === "VENDEDOR").length;
  const totalCompradores  = usuarios.filter(u => u.rol === "COMPRADOR").length;
  const usuariosActivos   = usuarios.filter(u => u.activo).length;

  const stats = [
    { label: "Usuarios",          value: loadingU ? "…" : totalUsuarios,         icon: Users,       color: "bg-slate-100",   iconColor: "text-slate-700",  href: "/admin/usuarios" },
    { label: "Vendedores",        value: loadingU ? "…" : totalVendedores,        icon: Star,        color: "bg-violet-50",   iconColor: "text-violet-600", href: "/admin/usuarios" },
    { label: "Compradores",       value: loadingU ? "…" : totalCompradores,       icon: ShoppingBag, color: "bg-indigo-50",   iconColor: "text-indigo-600", href: "/admin/usuarios" },
    { label: "Productos activos", value: loadingP ? "…" : totalProductosActivos,  icon: Package,     color: "bg-emerald-50",  iconColor: "text-emerald-600", href: "/admin/productos" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Bienvenido, <span className="font-medium text-slate-600">{user?.email}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, iconColor, href }) => (
          <Link key={label} href={href} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:shadow-slate-200/50 transition-all">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Ventas de la plataforma + reportes pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de ventas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" /> Ventas de la plataforma
              </h2>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                Bs. {loadingS && !estadisticas ? "…" : (estadisticas?.ingresosPeriodo ?? "0.00")}
              </p>
              <p className="text-xs text-slate-400">
                {estadisticas?.ordenesPeriodo ?? 0} orden{(estadisticas?.ordenesPeriodo ?? 0) !== 1 ? "es" : ""} pagadas en {dias} días
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {RANGOS.map((r) => (
                <button
                  key={r.dias}
                  onClick={() => setDias(r.dias)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    dias === r.dias ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56 w-full">
            {loadingS && !estadisticas ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : (estadisticas?.ordenesPeriodo ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <TrendingUp className="h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-500">Sin ventas en este periodo</p>
              </div>
            ) : (
              <VentasBarChart data={estadisticas?.ventasPorDia ?? []} dias={dias} />
            )}
          </div>
        </div>

        {/* Reportes pendientes */}
        <Link
          href="/admin/reportes"
          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all hover:shadow-md ${
            reportesPend > 0
              ? "bg-amber-50 border-amber-200 hover:shadow-amber-100"
              : "bg-white border-slate-200 hover:shadow-slate-200/50"
          }`}
        >
          <div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              reportesPend > 0 ? "bg-amber-100" : "bg-slate-100"
            }`}>
              <ShieldAlert className={`h-5 w-5 ${reportesPend > 0 ? "text-amber-600" : "text-slate-500"}`} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{loadingS && !estadisticas ? "…" : reportesPend}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
              Reportes por revisar
            </p>
          </div>
          <p className={`text-xs font-semibold flex items-center gap-1 mt-4 ${
            reportesPend > 0 ? "text-amber-700" : "text-slate-400"
          }`}>
            {reportesPend > 0 ? "Requieren tu atención" : "Todo al día"}
            <ChevronRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos usuarios */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Últimos usuarios registrados</h2>
            <Link href="/admin/usuarios" className="text-xs text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1">
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loadingU ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              <p className="text-xs text-slate-400">Cargando usuarios…</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {usuarios.slice(0, 5).map((u) => (
                <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {u.perfilVendedor?.nombreNegocio ?? u.perfilComprador?.nombreCompleto ?? u.email}
                    </p>
                    <p className="text-xs text-slate-400">{u.email} · {formatFecha(u.creadoEn)}</p>
                  </div>
                  <Badge variant={u.rol.toLowerCase() as "admin" | "vendedor" | "comprador"} size="sm" />
                </li>
              ))}
              {usuarios.length === 0 && (
                <li className="text-center py-8 text-sm text-slate-400">Sin usuarios registrados</li>
              )}
            </ul>
          )}
        </div>

        {/* Últimos productos */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Productos recientes</h2>
            <Link href="/admin/productos" className="text-xs text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1">
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loadingP ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              <p className="text-xs text-slate-400">Cargando productos…</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {productos.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.vendedor.nombreNegocio} · Bs. {p.precio}</p>
                  </div>
                  <Badge variant={p.activo ? "activo" : "inactivo"} size="sm" />
                </li>
              ))}
              {productos.length === 0 && (
                <li className="text-center py-8 text-sm text-slate-400">Sin productos</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="mt-6 bg-slate-800 rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Resumen del sistema</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">{loadingU ? "…" : usuariosActivos}</p>
            <p className="text-xs text-slate-400 mt-0.5">Cuentas activas</p>
          </div>
          <div>
            <p className="text-xl font-bold">{loadingP ? "…" : totalProductos}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total productos</p>
          </div>
          <div>
            <p className="text-xl font-bold">{loadingU ? "…" : usuarios.filter(u => !u.verificado).length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Sin verificar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
