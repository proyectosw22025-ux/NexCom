"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpDown, X, MapPin } from "lucide-react";
import { Select } from "@/components/ui/Select";

const ORDEN_OPCIONES = [
  { value: "RECIENTES",       label: "Más recientes" },
  { value: "PRECIO_ASC",      label: "Precio: menor a mayor" },
  { value: "PRECIO_DESC",     label: "Precio: mayor a menor" },
  { value: "MEJOR_VALORADOS", label: "Mejor valorados" },
];

// Capitales de departamento de Bolivia (la ciudad del vendedor)
const CIUDADES_OPCIONES = [
  { value: "",            label: "Todas las ciudades" },
  { value: "Santa Cruz",  label: "Santa Cruz" },
  { value: "La Paz",      label: "La Paz" },
  { value: "Cochabamba",  label: "Cochabamba" },
  { value: "Sucre",       label: "Sucre" },
  { value: "Oruro",       label: "Oruro" },
  { value: "Potosí",      label: "Potosí" },
  { value: "Tarija",      label: "Tarija" },
  { value: "Trinidad",    label: "Trinidad" },
  { value: "Cobija",      label: "Cobija" },
];

interface CatalogoToolbarProps {
  orden:      string;
  precioMin?: string;
  precioMax?: string;
  ciudad?:    string;
}

/**
 * Isla de cliente para filtros del catálogo. Mantiene el estado en la URL
 * (searchParams) → el grid se re-renderiza en el servidor (SSR) con los nuevos
 * filtros, queda compartible y es indexable. Al cambiar un filtro, se resetea
 * la paginación a la página 1.
 */
export function CatalogoToolbar({ orden, precioMin, precioMax, ciudad }: CatalogoToolbarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const [min, setMin] = useState(precioMin ?? "");
  const [max, setMax] = useState(precioMax ?? "");

  function pushParams(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("pagina"); // cambiar filtros vuelve a la página 1
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const hayPrecio = (precioMin ?? "") !== "" || (precioMax ?? "") !== "";

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
      {/* Orden */}
      <div className="sm:w-52">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Ordenar por</label>
        <Select
          value={orden}
          onValueChange={(v) => pushParams({ orden: v === "RECIENTES" ? null : v })}
          options={ORDEN_OPCIONES}
          icon={ArrowUpDown}
        />
      </div>

      {/* Ciudad */}
      <div className="sm:w-48">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Ciudad</label>
        <Select
          value={ciudad ?? ""}
          onValueChange={(v) => pushParams({ ciudad: v || null })}
          options={CIUDADES_OPCIONES}
          icon={MapPin}
        />
      </div>

      {/* Rango de precio */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Precio (Bs.)</label>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") pushParams({ precioMin: min || null, precioMax: max || null }); }}
            placeholder="Mín"
            className="w-0 flex-1 sm:w-24 sm:flex-none min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <span className="text-slate-300">–</span>
          <input
            type="number" min={0} inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") pushParams({ precioMin: min || null, precioMax: max || null }); }}
            placeholder="Máx"
            className="w-0 flex-1 sm:w-24 sm:flex-none min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <button
            onClick={() => pushParams({ precioMin: min || null, precioMax: max || null })}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                       rounded-xl transition-colors shadow-sm shadow-indigo-200"
          >
            Aplicar
          </button>
          {hayPrecio && (
            <button
              onClick={() => { setMin(""); setMax(""); pushParams({ precioMin: null, precioMax: null }); }}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              aria-label="Quitar filtro de precio"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
