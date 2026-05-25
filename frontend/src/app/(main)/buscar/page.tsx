"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { useState, useEffect, Suspense } from "react";
import { BUSCAR } from "@/graphql/productos/queries";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoCardSkeleton } from "@/components/productos/ProductoCardSkeleton";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface BuscarResult {
  buscar: {
    items:       ProductoCardData[];
    total:       number;
    pagina:      number;
    totalPaginas: number;
    termino:     string;
  };
}

function BuscarContent() {
  const searchParams = useSearchParams();
  const termino      = searchParams.get("q") ?? "";
  const [pagina, setPagina] = useState(1);
  const [input, setInput]   = useState(termino);
  const LIMITE = 12;

  useEffect(() => {
    setInput(termino);
    setPagina(1);
  }, [termino]);

  const { data, loading } = useQuery<BuscarResult>(BUSCAR, {
    variables:   { termino, pagina, limite: LIMITE },
    skip:        !termino,
    fetchPolicy: "cache-and-network",
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      window.history.pushState({}, "", `/buscar?q=${encodeURIComponent(input.trim())}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  const result = data?.buscar;

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

      {/* States */}
      {!termino ? (
        <div className="text-center py-24">
          <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">¿Qué estás buscando?</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Escribe el nombre de un producto para encontrarlo</p>
          <a
            href="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                       hover:text-indigo-700 transition-colors"
          >
            Ver todos los productos →
          </a>
        </div>
      ) : loading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductoCardSkeleton key={i} />)}
        </div>
      ) : !result || result.items.length === 0 ? (
        <div className="text-center py-24">
          <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">Sin resultados para &ldquo;{termino}&rdquo;</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Intenta con otras palabras clave</p>
          <a
            href="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                       hover:text-indigo-700 transition-colors"
          >
            Explorar todo el catálogo →
          </a>
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
