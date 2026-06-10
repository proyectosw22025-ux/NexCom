"use client";

import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { Select } from "./Select";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  /** Valor en formato "YYYY-MM-DDTHH:mm" (igual que <input type="datetime-local">) */
  value: string;
  onChange: (value: string) => void;
  /** Fecha mínima seleccionable, mismo formato que `value` */
  min?: string;
  placeholder?: string;
}

const HORAS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h).padStart(2, "0"),
  label: String(h).padStart(2, "0"),
}));

const MINUTOS = ["00", "15", "30", "45"].map((m) => ({ value: m, label: m }));

function parseValue(value: string): { date: Date | undefined; hora: string; minuto: string } {
  if (!value) return { date: undefined, hora: "00", minuto: "00" };
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hora, minuto] = (timePart ?? "00:00").split(":");
  return { date: new Date(year, month - 1, day), hora, minuto };
}

function formatValue(date: Date, hora: string, minuto: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${hora}:${minuto}`;
}

function formatDisplay(value: string): string {
  if (!value) return "";
  const { date, hora, minuto } = parseValue(value);
  if (!date) return "";
  const fecha = date.toLocaleDateString("es-BO", { weekday: "short", day: "numeric", month: "short" });
  return `${fecha}, ${hora}:${minuto}`;
}

export function DateTimePicker({ value, onChange, min, placeholder = "Seleccionar fecha y hora…" }: DateTimePickerProps) {
  const { date, hora, minuto } = parseValue(value);
  const minDate = min ? parseValue(min).date : undefined;

  function handleDateSelect(newDate: Date | undefined) {
    if (!newDate) return;
    onChange(formatValue(newDate, hora, minuto));
  }

  function handleHoraChange(newHora: string) {
    onChange(formatValue(date ?? new Date(), newHora, minuto));
  }

  function handleMinutoChange(newMinuto: string) {
    onChange(formatValue(date ?? new Date(), hora, newMinuto));
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all",
            !value && "text-slate-400"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
          {value ? formatDisplay(value) : placeholder}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-3 w-auto"
        >
          <DayPicker
            mode="single"
            locale={es}
            selected={date}
            onSelect={handleDateSelect}
            disabled={minDate ? { before: minDate } : undefined}
            className="text-sm"
          />
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Hora</span>
            <Select value={hora} onValueChange={handleHoraChange} options={HORAS} />
            <span className="text-slate-400">:</span>
            <Select value={minuto} onValueChange={handleMinutoChange} options={MINUTOS} />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
