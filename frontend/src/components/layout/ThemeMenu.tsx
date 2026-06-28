"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, SunMoon, Sparkles, Briefcase, Check, Palette } from "lucide-react";
import { useUiPrefs, type Modo, type Skin } from "@/context/ui-prefs-context";

const MODOS: { value: Modo; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "claro",  label: "Día",       icon: Sun,     hint: "Siempre claro" },
  { value: "oscuro", label: "Noche",     icon: Moon,    hint: "Siempre oscuro" },
  { value: "auto",   label: "Automático", icon: SunMoon, hint: "Según tu horario" },
];
const SKINS: { value: Skin; label: string; icon: typeof Sparkles; hint: string }[] = [
  { value: "joven",  label: "Joven",  icon: Sparkles,  hint: "Vibrante y animado" },
  { value: "adulto", label: "Adulto", icon: Briefcase, hint: "Sobrio y sin distracciones" },
];

export function ThemeMenu() {
  const { modo, skin, resuelto, setModo, setSkin } = useUiPrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const Icono = resuelto === "oscuro" ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Preferencias de visualización"
        title="Tema y apariencia"
        className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
      >
        <Icono className="h-5 w-5" />
      </button>

      {open && (
        <div role="menu" className="animate-scale-in origin-top-right absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-300/30 p-2 z-50">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
            <Palette className="h-3.5 w-3.5" /> Apariencia
          </div>

          {/* Día / Noche / Auto */}
          <p className="px-2 pt-1 pb-1 text-[11px] font-semibold text-slate-400">Tema</p>
          <div className="space-y-0.5">
            {MODOS.map(({ value, label, icon: Icon, hint }) => (
              <button
                key={value}
                onClick={() => setModo(value)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                  modo === value ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">
                  {label} <span className="text-[11px] text-slate-400">· {hint}</span>
                </span>
                {modo === value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>

          <hr className="my-2 border-slate-100" />

          {/* Joven / Adulto */}
          <p className="px-2 pb-1 text-[11px] font-semibold text-slate-400">Estilo</p>
          <div className="space-y-0.5">
            {SKINS.map(({ value, label, icon: Icon, hint }) => (
              <button
                key={value}
                onClick={() => setSkin(value)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                  skin === value ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">
                  {label} <span className="text-[11px] text-slate-400">· {hint}</span>
                </span>
                {skin === value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
