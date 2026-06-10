"use client";

import { useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { useState } from "react";
import { MIS_PRODUCTOS } from "@/graphql/productos/queries";
import { ELIMINAR_PRODUCTO } from "@/graphql/productos/mutations";
import { Plus, Package, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import type { ProductoCardData } from "@/components/productos/ProductoCard";

const FILAS_POR_PAGINA = 10;

export default function VendedorProductosPage() {
  const { data, loading, refetch } = useQuery<{ misProductos: ProductoCardData[] }>(MIS_PRODUCTOS, {
    fetchPolicy: "cache-and-network",
  });
  const [eliminarProducto, { loading: deleting }] = useMutation(ELIMINAR_PRODUCTO);
  const [paginaTabla, setPaginaTabla] = useState(1);

  const productos = data?.misProductos ?? [];
  const productosPaginados = productos.slice(
    (paginaTabla - 1) * FILAS_POR_PAGINA,
    paginaTabla * FILAS_POR_PAGINA
  );
  const totalPaginasTabla = Math.ceil(productos.length / FILAS_POR_PAGINA);

  async function handleDelete(id: string) {
    try {
      await eliminarProducto({ variables: { id } });
      toast.success("Producto desactivado.");
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al eliminar.")
        : "Error al eliminar.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Productos</h1>
          <p className="text-sm text-slate-400 mt-0.5">{productos.length} producto{productos.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/vendedor/productos/nuevo"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                     px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            <p className="text-xs text-slate-400">Cargando productos…</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="font-semibold text-slate-700 mb-1">Sin productos</p>
            <p className="text-sm text-slate-400 mb-6">Crea tu primer producto para empezar a vender</p>
            <Link href="/vendedor/productos/nuevo"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold
                             px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
              <Plus className="h-4 w-4" /> Crear producto
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productosPaginados.map((p, i) => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{p.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5 sm:hidden">{p.categoria.nombre}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{p.categoria.nombre}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-semibold text-slate-900">Bs. {p.precio}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <span className={`text-sm font-medium ${p.stock === 0 ? "text-red-500" : "text-slate-700"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant={p.activo ? "activo" : "inactivo"} size="sm" dot />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/vendedor/productos/${p.id}/editar`}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-indigo-600" />
                      </Link>
                      <ConfirmDialog
                        title="Desactivar producto"
                        description={`¿Desactivar el producto "${p.nombre}"? Podrás reactivarlo más tarde.`}
                        confirmLabel="Desactivar"
                        variant="danger"
                        onConfirm={() => handleDelete(p.id)}
                        trigger={
                          <button
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {!loading && totalPaginasTabla > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {(paginaTabla - 1) * FILAS_POR_PAGINA + 1}–{Math.min(paginaTabla * FILAS_POR_PAGINA, productos.length)} de {productos.length} productos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaTabla((p) => Math.max(1, p - 1))}
                disabled={paginaTabla === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>
              <span className="text-xs text-slate-500 px-1">{paginaTabla} / {totalPaginasTabla}</span>
              <button
                onClick={() => setPaginaTabla((p) => Math.min(totalPaginasTabla, p + 1))}
                disabled={paginaTabla === totalPaginasTabla}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
