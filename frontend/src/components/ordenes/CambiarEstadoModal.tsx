"use client";

import * as Dialog from "@radix-ui/react-alert-dialog";
import { useState, type ReactNode } from "react";
import { Loader2, ArrowRight, Package, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Máquina de estados (espejo de TRANSICIONES_VENDEDOR en el backend).
 * El frontend solo ofrece transiciones válidas para evitar requests que el
 * servidor rechazaría — el backend sigue siendo la fuente de verdad.
 */
const TRANSICIONES_VENDEDOR: Record<string, { siguiente: string; label: string; accion: string; icon: LucideIcon }> = {
  PAGADO:         { siguiente: "EN_PREPARACION", label: "En preparación", accion: "Iniciar preparación",  icon: Package },
  EN_PREPARACION: { siguiente: "ENVIADO",        label: "Enviado",        accion: "Marcar como enviado", icon: Truck },
};

const ESTADO_LABEL: Record<string, string> = {
  PAGADO: "Pagado", EN_PREPARACION: "En preparación", ENVIADO: "Enviado",
};

export function transicionDisponible(estado: string): boolean {
  return estado in TRANSICIONES_VENDEDOR;
}

interface CambiarEstadoModalProps {
  trigger:      ReactNode;
  estadoActual: string;
  /** Recibe la nota y el comprobante opcionales; debe lanzar si falla */
  onConfirm:    (input: { notas?: string; comprobanteUrl?: string }) => Promise<void>;
}

export function CambiarEstadoModal({ trigger, estadoActual, onConfirm }: CambiarEstadoModalProps) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [notas, setNotas]     = useState("");
  const [comprobante, setComprobante] = useState("");

  const transicion = TRANSICIONES_VENDEDOR[estadoActual];
  if (!transicion) return null;

  const Icon       = transicion.icon;
  const esEnvio    = transicion.siguiente === "ENVIADO";

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm({
        notas:          notas.trim() || undefined,
        comprobanteUrl: esEnvio ? (comprobante.trim() || undefined) : undefined,
      });
      setOpen(false);
      setNotas("");
      setComprobante("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-[90vw] max-w-md z-50">
          <Dialog.Title className="text-base font-bold text-slate-900">Actualizar estado de la orden</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 mt-1">
            Confirma el avance del pedido. El cliente será notificado automáticamente.
          </Dialog.Description>

          {/* Transición visual X → Y */}
          <div className="flex items-center justify-center gap-3 my-5 py-4 bg-slate-50 rounded-xl">
            <span className="text-sm font-semibold text-slate-500 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
              {ESTADO_LABEL[estadoActual] ?? estadoActual}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <Icon className="h-4 w-4" /> {transicion.label}
            </span>
          </div>

          {/* Comprobante de envío (solo al pasar a ENVIADO) */}
          {esEnvio && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Comprobante de envío <span className="text-slate-400 normal-case font-normal">(opcional)</span>
              </label>
              <input
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="https://… enlace de seguimiento o foto de la guía"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          )}

          {/* Nota opcional */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Nota para el cliente <span className="text-slate-400 normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ej. Tu pedido sale hoy por la tarde…"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Dialog.Cancel asChild>
              <button
                type="button"
                disabled={loading}
                className="flex-1 border border-slate-200 text-slate-700 font-semibold rounded-xl py-2.5 text-sm
                           hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </Dialog.Cancel>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                         text-white font-semibold rounded-xl py-2.5 text-sm transition-colors
                         disabled:opacity-50 shadow-sm shadow-indigo-200"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {transicion.accion}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
