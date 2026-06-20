"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { useLazyQuery } from "@apollo/client";
import Image from "next/image";
import { SUGERENCIAS_BUSQUEDA } from "@/graphql/productos/queries";

interface Sugerencia { id: string; nombre: string; precio: string; imagenUrl: string | null }
interface SugerenciasResult { sugerenciasBusqueda: Sugerencia[] }

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1); // navegación por teclado
  const containerRef = useRef<HTMLDivElement>(null);

  const [sugerir, { data, loading }] = useLazyQuery<SugerenciasResult>(SUGERENCIAS_BUSQUEDA);

  useEffect(() => {
    if (query.trim().length < 2) {
      setIsOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      sugerir({ variables: { termino: query.trim() } });
      setIsOpen(true);
      setActiveIdx(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, sugerir]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sugerencias = data?.sugerenciasBusqueda ?? [];

  function irABuscar(termino: string) {
    if (!termino.trim()) return;
    setIsOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(termino.trim())}`);
  }

  function irAProducto(productoId: string) {
    setIsOpen(false);
    setQuery("");
    router.push(`/productos/${productoId}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Si hay una sugerencia activa por teclado, abrir ese producto; si no, búsqueda general
    if (activeIdx >= 0 && sugerencias[activeIdx]) irAProducto(sugerencias[activeIdx].id);
    else irABuscar(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos…"
            aria-label="Buscar productos"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2
                       focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setIsOpen(false); }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </form>

      {isOpen && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200
                     rounded-xl shadow-lg shadow-slate-200/60 z-50 overflow-hidden"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando…
            </div>
          )}

          {!loading && sugerencias.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && sugerencias.length > 0 && (
            <>
              <ul className="divide-y divide-slate-100">
                {sugerencias.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={activeIdx === i}>
                    <button
                      onClick={() => irAProducto(p.id)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                        activeIdx === i ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                        {p.imagenUrl
                          ? <Image src={p.imagenUrl} alt={p.nombre} fill className="object-cover" />
                          : <div className="w-full h-full bg-slate-200" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                        <p className="text-xs text-indigo-600 font-semibold">Bs. {p.precio}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => irABuscar(query)}
                className="w-full py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50
                           transition-colors border-t border-slate-100 text-center"
              >
                Ver todos los resultados para &ldquo;{query}&rdquo; →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
