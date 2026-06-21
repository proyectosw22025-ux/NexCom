"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { TODOS_PRODUCTOS } from "@/graphql/admin/queries";
import { TOGGLE_DESTACADO } from "@/graphql/productos/mutations";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, Star, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface ProductoAdmin {
  id: string; nombre: string; precio: string; stock: number;
  activo: boolean; destacado: boolean; creadoEn: string;
  categoria: { nombre: string };
  vendedor:  { nombreNegocio: string };
  imagenes:  { url: string }[];
}

const FILAS = 12;

export default function AdminProductosPage() {
  const [pagina, setPagina] = useState(1);
  const [search, setSearch] = useState("");
  const [soloActivos, setSoloActivos] = useState<boolean | undefined>(undefined);

  const { data, loading, refetch } = useQuery<{
    productos: { items: ProductoAdmin[]; total: number; totalPaginas: number }
  }>(TODOS_PRODUCTOS, {
    variables: { pagina, limite: FILAS, soloActivos },
    fetchPolicy: "cache-and-network",
  });

  const [toggleDestacado, { loading: toggling }] = useMutation(TOGGLE_DESTACADO);

  const productos    = data?.productos?.items ?? [];
  const total        = data?.productos?.total ?? 0;
  const totalPaginas = data?.productos?.totalPaginas ?? 1;

  const filtrados = search
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.vendedor.nombreNegocio.toLowerCase().includes(search.toLowerCase())
      )
    : productos;

  async function handleToggle(id: string) {
    try {
      await toggleDestacado({ variables: { id } });
      toast.success("Producto actualizado.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
        <p className="text-sm text-slate-400 mt-0.5">{total} productos en total</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o tienda…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
          />
        </div>
        {([undefined, true, false] as const).map((val) => (
          <button
            key={String(val)}
            onClick={() => { setSoloActivos(val); setPagina(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              soloActivos === val
                ? "bg-slate-800 text-white border-slate-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {val === undefined ? "Todos" : val ? "Activos" : "Inactivos"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando productos…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Package} titulo="Sin productos" subtitulo="No hay productos que coincidan con el filtro." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Producto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendedor</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Destacado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((p, i) => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900 line-clamp-1">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.categoria.nombre}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">{p.vendedor.nombreNegocio}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">Bs. {p.precio}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${p.stock <= 5 ? "text-amber-600" : "text-slate-700"}`}>{p.stock}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={p.activo ? "activo" : "inactivo"} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleToggle(p.id)}
                      disabled={toggling}
                      title={p.destacado ? "Quitar destacado" : "Marcar como destacado"}
                      className={`transition-colors ${p.destacado ? "text-amber-400 hover:text-amber-500" : "text-slate-200 hover:text-amber-300"}`}
                    >
                      <Star className={`h-4 w-4 ${p.destacado ? "fill-amber-400" : ""}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Página {pagina} de {totalPaginas} · {total} productos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
