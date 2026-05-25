"use client";

import { useQuery } from "@apollo/client";
import { LISTAR_USUARIOS, TODOS_PRODUCTOS } from "@/graphql/admin/queries";
import { BarChart2, Users, Package, ShoppingBag, TrendingUp, Star } from "lucide-react";

interface UsuarioAdmin {
  id: string; rol: string; verificado: boolean; activo: boolean; creadoEn: string;
}
interface ProductoAdmin {
  id: string; stock: number; activo: boolean; destacado: boolean; creadoEn: string;
  categoria: { nombre: string };
}

export default function AdminReportesPage() {
  const { data: usuariosData } = useQuery<{ listarUsuarios: UsuarioAdmin[] }>(
    LISTAR_USUARIOS, { fetchPolicy: "cache-and-network" },
  );
  const { data: productosData } = useQuery<{ productos: { items: ProductoAdmin[]; total: number } }>(
    TODOS_PRODUCTOS, { variables: { pagina: 1, limite: 1000, soloActivos: false }, fetchPolicy: "cache-and-network" },
  );

  const usuarios  = usuariosData?.listarUsuarios ?? [];
  const productos = productosData?.productos?.items ?? [];

  const totalProductos   = productosData?.productos?.total ?? 0;
  const productosActivos = productos.filter(p => p.activo).length;
  const sinStock         = productos.filter(p => p.stock === 0).length;
  const stockBajo        = productos.filter(p => p.stock > 0 && p.stock <= 5).length;
  const destacados       = productos.filter(p => p.destacado).length;

  const vendedores   = usuarios.filter(u => u.rol === "VENDEDOR").length;
  const compradores  = usuarios.filter(u => u.rol === "COMPRADOR").length;
  const verificados  = usuarios.filter(u => u.verificado).length;
  const activos      = usuarios.filter(u => u.activo).length;

  const categorias = productos.reduce<Record<string, number>>((acc, p) => {
    acc[p.categoria.nombre] = (acc[p.categoria.nombre] ?? 0) + 1;
    return acc;
  }, {});
  const topCategorias = Object.entries(categorias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const statCards = [
    { label: "Total usuarios",       value: usuarios.length,  icon: Users,       color: "bg-slate-100",   text: "text-slate-700" },
    { label: "Vendedores",           value: vendedores,        icon: ShoppingBag, color: "bg-violet-50",   text: "text-violet-600" },
    { label: "Compradores",          value: compradores,       icon: Users,       color: "bg-indigo-50",   text: "text-indigo-600" },
    { label: "Total productos",      value: totalProductos,    icon: Package,     color: "bg-slate-100",   text: "text-slate-700" },
    { label: "Productos activos",    value: productosActivos,  icon: TrendingUp,  color: "bg-emerald-50",  text: "text-emerald-600" },
    { label: "Destacados",           value: destacados,        icon: Star,        color: "bg-amber-50",    text: "text-amber-600" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-400 mt-0.5">Vista general del estado del marketplace</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, text }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${text}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de usuarios */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Estado de cuentas</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Verificadas",    value: verificados,              color: "bg-emerald-500" },
              { label: "Sin verificar",  value: usuarios.length - verificados, color: "bg-amber-400" },
              { label: "Activas",        value: activos,                  color: "bg-indigo-500" },
              { label: "Desactivadas",   value: usuarios.length - activos, color: "bg-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: usuarios.length > 0 ? `${(value / usuarios.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado de stock */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Estado de inventario</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Con stock normal",  value: productos.filter(p => p.stock > 5).length, color: "bg-emerald-500" },
              { label: "Stock bajo (≤5)",   value: stockBajo,   color: "bg-amber-400" },
              { label: "Sin stock",         value: sinStock,     color: "bg-red-400" },
              { label: "Inactivos",         value: productos.filter(p => !p.activo).length, color: "bg-slate-300" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: totalProductos > 0 ? `${(value / totalProductos) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top categorías */}
        {topCategorias.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Productos por categoría</h2>
            </div>
            <div className="space-y-3">
              {topCategorias.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{cat}</span>
                    <span className="font-semibold text-slate-900">{count} productos</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: totalProductos > 0 ? `${(count / totalProductos) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Sprint 5 — Próximamente</p>
        <p className="text-sm text-amber-800">
          Los reportes de ventas, ingresos, órdenes por período y métricas avanzadas estarán disponibles
          con el módulo de reportes del Sprint 5.
        </p>
      </div>
    </div>
  );
}
