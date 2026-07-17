"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { useState, useEffect, Suspense } from "react";
import { BUSCAR, PRODUCTOS } from "@/graphql/productos/queries";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoCardSkeleton } from "@/components/productos/ProductoCardSkeleton";
import { Search, ChevronLeft, ChevronRight, Sparkles, Store, X } from "lucide-react";
import Link from "next/link";

interface BuscarResult {
  buscar: {
    items:       ProductoCardData[];
    total:       number;
    pagina:      number;
    totalPaginas: number;
    termino:     string;
  };
}

interface ProductosResult {
  productos: { items: ProductoCardData[] };
}

function BuscarContent() {
  const searchParams = useSearchParams();
  const termino      = searchParams.get("q") ?? "";
  const [pagina, setPagina] = useState(1);
  const [input, setInput]   = useState(termino);
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  // Tiendas presentes en los resultados SIN filtrar (para no colapsar los chips
  // al seleccionar una tienda). Se capturan en el primer resultado sin filtro.
  const [tiendas, setTiendas] = useState<{ id: string; nombre: string }[]>([]);
  const LIMITE = 12;

  useEffect(() => {
    setInput(termino);
    setPagina(1);
    setTiendaId(null);
    setTiendas([]);
  }, [termino]);

  const { data, loading } = useQuery<BuscarResult>(BUSCAR, {
    variables:   { termino, pagina, limite: LIMITE, vendedorId: tiendaId },
    skip:        !termino,
    fetchPolicy: "cache-and-network",
  });

  const result = data?.buscar;

  // Captura la lista de tiendas de los resultados sin filtro (facetas).
  useEffect(() => {
    if (tiendaId || !result?.items?.length) return;
    const mapa = new Map<string, string>();
    for (const p of result.items) {
      if (p.vendedor?.id) mapa.set(p.vendedor.id, p.vendedor.nombreNegocio);
    }
    if (mapa.size > 0) setTiendas(Array.from(mapa, ([id, nombre]) => ({ id, nombre })));
  }, [result, tiendaId]);

  const sinResultados = !!termino && !loading && !!result && result.items.length === 0;

  // Fallback "nunca una página vacía": al no haber resultados, sugerir productos
  // populares. Solo se dispara cuando confirmamos 0 resultados (skip controla el costo).
  const { data: sugeridosData } = useQuery<ProductosResult>(PRODUCTOS, {
    variables:   { pagina: 1, limite: 4, soloActivos: true },
    skip:        !sinResultados,
    fetchPolicy: "cache-first",
  });
  const sugeridos = sugeridosData?.productos.items ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      window.history.pushState({}, "", `/buscar?q=${encodeURIComponent(input.trim())}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm
                       shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600
                       hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors
                       shadow-sm shadow-indigo-200"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Header */}
      {termino && (
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">
            Resultados para &ldquo;<span className="text-indigo-600">{termino}</span>&rdquo;
          </h1>
          {result && (
            <p className="text-sm text-slate-400 mt-1">{result.total} producto{result.total !== 1 ? "s" : ""} encontrado{result.total !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}

      {/* Filtro por tienda (facetas) */}
      {termino && tiendas.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Store className="h-3.5 w-3.5" /> Tienda:
          </span>
          <button
            onClick={() => { setTiendaId(null); setPagina(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              tiendaId === null
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todas
          </button>
          {tiendas.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTiendaId(t.id); setPagina(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1 ${
                tiendaId === t.id
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.nombre}
              {tiendaId === t.id && <X className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {!termino ? (
        <div className="text-center py-24">
          <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">¿Qué estás buscando?</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Escribe el nombre de un producto para encontrarlo</p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                       hover:text-indigo-700 transition-colors"
          >
            Ver todos los productos →
          </Link>
        </div>
      ) : loading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductoCardSkeleton key={i} />)}
        </div>
      ) : !result || result.items.length === 0 ? (
        <div>
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="font-semibold text-slate-700">Sin resultados para &ldquo;{termino}&rdquo;</p>
            <p className="text-sm text-slate-400 mt-1 mb-5">
              Revisa la ortografía o intenta con términos más generales
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                         hover:text-indigo-700 transition-colors"
            >
              Explorar todo el catálogo →
            </Link>
          </div>

          {/* Nunca una página 100% vacía: sugerencias populares */}
          {sugeridos.length > 0 && (
            <div className="border-t border-slate-100 pt-8 mt-2">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900">Productos que te pueden interesar</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sugeridos.map((p, index) => <ProductoCard key={p.id} producto={p} index={index} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {result.items.map((p, index) => <ProductoCard key={p.id} producto={p} index={index} />)}
          </div>

          {result.totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-600 px-4">Página {pagina} de {result.totalPaginas}</span>
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
  );
}

export default function BuscarPage() {
  return (
    <Suspense>
      <BuscarContent />
    </Suspense>
  );
}
