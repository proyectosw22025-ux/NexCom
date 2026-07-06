"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Calendario de rango propio (sin <input type="date"> nativo): dos clics marcan
 * inicio y fin, con el rango resaltado. Sin dependencias externas — estilizado
 * con el design system de NexCom y consistente entre navegadores.
 *
 * Fechas como "YYYY-MM-DD" (fuente de verdad string, sin sorpresas de zona horaria).
 */
interface Props {
  desde: string | null;
  hasta: string | null;
  max?: string;                                   // fecha máxima seleccionable (p. ej. hoy)
  soloUno?: boolean;                              // modo fecha única (desde = hasta)
  onChange: (desde: string | null, hasta: string | null) => void;
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function DateRangePicker({ desde, hasta, max, soloUno, onChange }: Props) {
  // Mes visible: arranca en el mes de "desde" o el actual
  const base = desde ? new Date(`${desde}T12:00:00`) : new Date();
  const [anio, setAnio] = useState(base.getFullYear());
  const [mes, setMes]   = useState(base.getMonth());

  const diasMes    = new Date(anio, mes + 1, 0).getDate();
  const offsetLun  = (new Date(anio, mes, 1).getDay() + 6) % 7; // semana inicia lunes
  const celdas: (number | null)[] = [
    ...Array<null>(offsetLun).fill(null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ];

  function clickDia(d: number) {
    const f = iso(anio, mes, d);
    if (max && f > max) return;
    if (soloUno) { onChange(f, f); return; }                        // fecha única
    if (!desde || (desde && hasta)) { onChange(f, null); return; }  // 1er clic (o reinicio)
    if (f < desde) { onChange(f, desde); return; }                  // 2º clic hacia atrás → swap
    onChange(desde, f);
  }

  function navegar(delta: number) {
    const total = anio * 12 + mes + delta; // meses absolutos → sin bordes de año
    setAnio(Math.floor(total / 12));
    setMes(((total % 12) + 12) % 12);
  }

  const enRango = (f: string) => desde && hasta && f > desde && f < hasta;
  const esBorde = (f: string) => f === desde || f === hasta;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/60 p-3 w-[272px] select-none">
      {/* Cabecera de navegación */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navegar(-1)} aria-label="Mes anterior"
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <p className="text-sm font-bold text-slate-800">{MESES[mes]} {anio}</p>
        <button onClick={() => navegar(1)} aria-label="Mes siguiente"
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS.map((d) => (
          <span key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</span>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {celdas.map((d, i) => {
          if (d === null) return <span key={`v${i}`} />;
          const f = iso(anio, mes, d);
          const deshabilitado = !!max && f > max;
          const borde  = esBorde(f);
          const dentro = enRango(f);
          return (
            <button
              key={f}
              onClick={() => clickDia(d)}
              disabled={deshabilitado}
              className={[
                "h-8 text-xs font-medium transition-colors",
                borde  ? "bg-indigo-600 text-white rounded-lg font-bold shadow-sm shadow-indigo-200"
                : dentro ? "bg-indigo-50 text-indigo-700"
                : deshabilitado ? "text-slate-300 cursor-not-allowed"
                : "text-slate-700 hover:bg-slate-100 rounded-lg",
              ].join(" ")}
            >
              {d}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-2">
        {soloUno
          ? "Elige una fecha"
          : !desde ? "Elige la fecha de inicio" : !hasta ? "Ahora elige la fecha final" : "Rango listo — puedes ajustarlo"}
      </p>
    </div>
  );
}

/**
 * Campo de fecha para formularios (reemplaza <input type="date"> nativo):
 * botón con la fecha elegida que abre el calendario propio en un popover.
 */
export function DatePickerInput({ value, onChange, max, placeholder = "Elegir fecha" }:
  { value: string; onChange: (v: string) => void; max?: string; placeholder?: string }) {
  const [abierto, setAbierto] = useState(false);
  const legible = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })
    : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`w-full text-left px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                    transition-colors hover:border-indigo-300 focus:outline-none focus:ring-2
                    focus:ring-indigo-500/20 focus:border-indigo-400 ${value ? "text-slate-800" : "text-slate-400"}`}
      >
        {legible}
      </button>
      {abierto && (
        <>
          {/* Cierre por clic fuera */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute z-50 mt-1.5 animate-scale-in origin-top-left">
            <DateRangePicker
              desde={value || null} hasta={value || null} max={max} soloUno
              onChange={(d) => { if (d) { onChange(d); setAbierto(false); } }}
            />
          </div>
        </>
      )}
    </div>
  );
}
