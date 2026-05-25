"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { useLazyQuery } from "@apollo/client";
import Image from "next/image";
import { BUSCAR } from "@/graphql/productos/queries";
import type { ProductoCardData } from "@/components/productos/ProductoCard";

interface BuscarResult {
  buscar: {
    items: ProductoCardData[];
    total: number;
  };
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [buscar, { data, loading }] = useLazyQuery<BuscarResult>(BUSCAR);

  useEffect(() => {
    if (query.trim().length < 2) {
      setIsOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      buscar({ variables: { termino: query.trim(), pagina: 1, limite: 6 } });
      setIsOpen(true);
    }, 320);
    return () => clearTimeout(timer);
  }, [query, buscar]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSelectResult(productoId: string) {
    setIsOpen(false);
    setQuery("");
    router.push(`/productos/${productoId}`);
  }

  const resultados = data?.buscar?.items ?? [];
  const total = data?.buscar?.total ?? 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
            placeholder="Buscar productos…"
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2
                       focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setIsOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200
                        rounded-xl shadow-lg shadow-slate-200/60 z-50 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando…
            </div>
          )}

          {!loading && resultados.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && resultados.length > 0 && (
            <>
              <ul className="divide-y divide-slate-100">
                {resultados.map((p) => {
                  const img = [...p.imagenes].sort((a, b) => a.orden - b.orden)[0]?.url;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => handleSelectResult(p.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                          {img
                            ? <Image src={img} alt={p.nombre} fill className="object-cover" />
                            : <div className="w-full h-full bg-slate-200" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                          <p className="text-xs text-indigo-600 font-semibold">Bs. {p.precio}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {total > 6 && (
                <button
                  onClick={handleSubmit as unknown as React.MouseEventHandler}
                  className="w-full py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50
                             transition-colors border-t border-slate-100 text-center"
                >
                  Ver los {total} resultados para &ldquo;{query}&rdquo; →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
