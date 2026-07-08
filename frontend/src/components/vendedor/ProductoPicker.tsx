"use client";

import { useMemo, useState } from "react";
import { Search, CheckSquare, Square, Package, X } from "lucide-react";
import { coincideBusqueda } from "@/lib/normalizar";

export interface ProductoPickerItem {
  id: string;
  nombre: string;
  precio: string;
  stock: number;
  categoria: { nombre: string };
}

/**
 * Selector de productos con búsqueda inteligente (nombre/categoría, sin
 * acentos) y "seleccionar todos los filtrados". Sustituye a la lista plana
 * que obligaba a hacer scroll infinito cuando el vendedor tiene muchos
 * productos (hasta 500 en el plan PRO).
 */
export function ProductoPicker({ productos, seleccionados, onChange }: {
  productos: ProductoPickerItem[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    if (!q.trim()) return productos;
    return productos.filter((p) => coincideBusqueda(`${p.nombre} ${p.categoria.nombre}`, q));
  }, [productos, q]);

  const sel = new Set(seleccionados);
  const idsFiltrados = filtrados.map((p) => p.id);
  const todosFiltradosSel = idsFiltrados.length > 0 && idsFiltrados.every((id) => sel.has(id));

  function toggle(id: string) {
    onChange(sel.has(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);
  }

  function toggleTodosFiltrados() {
    if (todosFiltradosSel) {
      onChange(seleccionados.filter((id) => !idsFiltrados.includes(id)));
    } else {
      onChange([...new Set([...seleccionados, ...idsFiltrados])]);
    }
  }

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda inteligente */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o categoría…"
          className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Meta + seleccionar todos los filtrados */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {q ? `${filtrados.length} de ${productos.length}` : `${productos.length}`} producto{productos.length !== 1 ? "s" : ""}
          {seleccionados.length > 0 && <span className="text-indigo-600 font-semibold"> · {seleccionados.length} seleccionado{seleccionados.length !== 1 ? "s" : ""}</span>}
        </span>
        {filtrados.length > 0 && (
          <button
            type="button"
            onClick={toggleTodosFiltrados}
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {todosFiltradosSel ? "Quitar todos" : "Seleccionar todos"}{q ? " (filtrados)" : ""}
          </button>
        )}
      </div>

      {/* Lista filtrada */}
      {filtrados.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">
          {q ? `Sin resultados para “${q}”.` : "No hay productos."}
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filtrados.map((p) => {
            const activo = sel.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={activo}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  activo ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {activo
                  ? <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                  : <Square className="h-4 w-4 text-slate-300 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Package className="h-3 w-3 text-slate-300" /> {p.categoria.nombre} · Stock: {p.stock}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-700 shrink-0">Bs. {p.precio}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
