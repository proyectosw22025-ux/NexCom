"use client";

import { cn } from "@/lib/utils";

export interface FilterPillOption<T extends string> {
  value: T;
  label: string;
  /** Contador opcional mostrado como badge dentro de la pill */
  count?: number;
}

interface FilterPillsProps<T extends string> {
  options:  FilterPillOption<T>[];
  value:    T;
  onChange: (value: T) => void;
  accent?:  "slate" | "indigo" | "violet";
  /** Etiqueta accesible para el grupo de filtros */
  ariaLabel?: string;
}

const ACCENT_ACTIVE: Record<NonNullable<FilterPillsProps<string>["accent"]>, string> = {
  slate:  "bg-slate-800 text-white border-slate-800",
  indigo: "bg-indigo-600 text-white border-indigo-600",
  violet: "bg-violet-600 text-white border-violet-600",
};

/**
 * Grupo de filtros tipo "chip" con feedback inmediato (sin recargar página).
 * Patrón de Linear/Notion. Accesible vía role="tablist" + aria-selected.
 */
export function FilterPills<T extends string>({
  options, value, onChange, accent = "slate", ariaLabel,
}: FilterPillsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5",
              active ? ACCENT_ACTIVE[accent] : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
