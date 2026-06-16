"use client";

import { CreditCard, Package, Truck, CheckCircle2, XCircle, Clock, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface HistorialEstado {
  id:             string;
  estadoAnterior: string | null;
  estadoNuevo:    string;
  notas:          string | null;
  creadoEn:       string;
}

interface EstadoMeta {
  label: string;
  icon:  LucideIcon;
  /** clases tailwind para el punto activo/completado */
  color: string;
}

const ESTADO_META: Record<string, EstadoMeta> = {
  PENDIENTE_PAGO: { label: "Pendiente de pago", icon: Clock,        color: "bg-amber-500" },
  PAGADO:         { label: "Pago confirmado",   icon: CreditCard,   color: "bg-emerald-500" },
  EN_PREPARACION: { label: "En preparación",    icon: Package,      color: "bg-indigo-500" },
  ENVIADO:        { label: "Enviado",           icon: Truck,        color: "bg-violet-500" },
  ENTREGADO:      { label: "Entregado",         icon: CheckCircle2, color: "bg-emerald-600" },
  COMPLETADO:     { label: "Completado",        icon: Star,         color: "bg-emerald-600" },
  CANCELADO:      { label: "Cancelado",         icon: XCircle,      color: "bg-red-500" },
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

interface TimelineEstadosProps {
  historial:    HistorialEstado[];
  estadoActual: string;
}

/**
 * Línea de tiempo vertical del recorrido de una orden (patrón de tracking de
 * Amazon / Mercado Libre). El último evento se resalta como estado actual;
 * los anteriores quedan en gris conectados por una línea continua.
 */
export function TimelineEstados({ historial, estadoActual }: TimelineEstadosProps) {
  if (historial.length === 0) {
    return <p className="text-sm text-slate-400">Aún no hay movimientos registrados.</p>;
  }

  // El historial llega ordenado ascendente (más antiguo → más reciente)
  const ultimoIndex = historial.length - 1;

  return (
    <ol className="relative">
      {historial.map((h, index) => {
        const meta    = ESTADO_META[h.estadoNuevo] ?? { label: h.estadoNuevo, icon: Clock, color: "bg-slate-400" };
        const Icon    = meta.icon;
        const isLast  = index === ultimoIndex;
        const isActual = isLast && h.estadoNuevo === estadoActual;
        const cancelado = h.estadoNuevo === "CANCELADO";

        return (
          <li key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Línea conectora (no en el último) */}
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200"
                aria-hidden="true"
              />
            )}

            {/* Punto con ícono */}
            <span
              className={[
                "relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                "transition-colors duration-300",
                isActual && !cancelado ? `${meta.color} ring-4 ring-indigo-100` : meta.color,
                "text-white shadow-sm",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" strokeWidth={2.5} />
            </span>

            {/* Contenido */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold ${isActual ? "text-slate-900" : "text-slate-700"}`}>
                  {meta.label}
                </p>
                {isActual && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Actual
                  </span>
                )}
              </div>
              {h.notas && <p className="text-xs text-slate-500 mt-0.5">{h.notas}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{formatFecha(h.creadoEn)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
