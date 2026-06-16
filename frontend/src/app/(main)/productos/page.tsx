"use client";

import { useQuery } from "@apollo/client";
import { useState } from "react";
import { PRODUCTOS, CATEGORIAS } from "@/graphql/productos/queries";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoCardSkeleton } from "@/components/productos/ProductoCardSkeleton";
import { ChevronLeft, ChevronRight, Filter, Package } from "lucide-react";
import Link from "next/link";

interface PaginatedProductos {
  items: ProductoCardData[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export default function ProductosPage() {
  const [pagina, setPagina]        = useState(1);
  const [categoriaId, setCatId]    = useState<string | null>(null);
  const LIMITE = 12;

  const { data, loading } = useQuery<{ productos: PaginatedProductos }>(PRODUCTOS, {
    variables: { pagina, limite: LIMITE, categoriaId, soloActivos: true },
    // cache-first: el catálogo es dato público estable y el backend ya garantiza
    // frescura con TTL en Redis. Evita round-trips redundantes al navegar
    // atrás/adelante o cambiar de página/categoría ya visitada.
    fetchPolicy: "cache-first",
  });

  const { data: catData } = useQuery<{ categorias: { id: string; nombre: string; slug: string; hijos: { id: string; nombre: string }[] }[] }>(
    CATEGORIAS, { variables: { soloRaices: false } }
  );

  const result     = data?.productos;
  const categorias = catData?.categorias ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Sidebar filtros */}
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Categorías</h2>
            </div>
            <button
              onClick={() => { setCatId(null); setPagina(1); }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-1 ${
                !categoriaId ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setCatId(cat.id); setPagina(1); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${
                  categoriaId === cat.id
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Catálogo</h1>
              {result && (
                <p className="text-sm text-slate-400 mt-0.5">{result.total} productos</p>
              )}
            </div>
          </div>

          {loading && !data ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ProductoCardSkeleton key={i} />)}
            </div>
          ) : !result || result.items.length === 0 ? (
            <div className="text-center py-24">
              <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="font-semibold text-slate-700">Sin productos disponibles</p>
              <p className="text-sm text-slate-400 mt-1">Intenta con otra categoría o vuelve pronto</p>
              <Link
                href="/buscar"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                           hover:text-indigo-700 transition-colors"
              >
                Buscar un producto específico →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {result.items.map((p, index) => <ProductoCard key={p.id} producto={p} index={index} />)}
              </div>

              {/* Pagination */}
              {result.totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-slate-600 px-4">
                    Página {pagina} de {result.totalPaginas}
                  </span>
                  <button
                    onClick={() => setPagina((p) => Math.min(result.totalPaginas, p + 1))}
                    disabled={pagina === result.totalPaginas}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
