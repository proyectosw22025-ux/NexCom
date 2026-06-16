"use client";

import * as Dialog from "@radix-ui/react-alert-dialog";
import { useState, type ReactNode } from "react";
import { useMutation, ApolloError } from "@apollo/client";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CREAR_REPORTE } from "@/graphql/reportes/mutations";
import { cn } from "@/lib/utils";

type TipoReporte = "PRODUCTO" | "VENDEDOR" | "VALORACION" | "OFERTA" | "MENSAJE";

const MOTIVOS = [
  "Producto falso o engañoso",
  "Contenido inapropiado",
  "Spam o estafa",
  "Precio fraudulento",
  "Otro",
];

interface ReportarDialogProps {
  trigger:      ReactNode;
  tipo:         TipoReporte;
  referenciaId: string;
}

/**
 * Diálogo para que cualquier usuario autenticado reporte contenido. Alimenta
 * la cola de moderación del admin (`/admin/reportes`) — cierra el circuito que
 * antes no tenía punto de entrada en la UI.
 */
export function ReportarDialog({ trigger, tipo, referenciaId }: ReportarDialogProps) {
  const [open, setOpen]           = useState(false);
  const [motivo, setMotivo]       = useState<string | null>(null);
  const [descripcion, setDescr]   = useState("");
  const [crearReporte, { loading }] = useMutation(CREAR_REPORTE);

  async function handleSubmit() {
    if (!motivo) { toast.error("Selecciona un motivo."); return; }
    try {
      await crearReporte({
        variables: { tipo, referenciaId, motivo, descripcion: descripcion.trim() || null },
      });
      toast.success("Reporte enviado. Nuestro equipo lo revisará.");
      setOpen(false);
      setMotivo(null);
      setDescr("");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-[90vw] max-w-md z-50">
          <div className="flex items-center gap-2 mb-1">
            <Flag className="h-4 w-4 text-red-500" />
            <Dialog.Title className="text-base font-bold text-slate-900">Reportar</Dialog.Title>
          </div>
          <Dialog.Description className="text-sm text-slate-500 mb-4">
            Ayúdanos a mantener NexCom seguro. Tu reporte es confidencial.
          </Dialog.Description>

          {/* Motivos */}
          <div className="space-y-1.5 mb-4">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors",
                  motivo === m
                    ? "border-red-300 bg-red-50 text-red-700 font-semibold"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <textarea
            value={descripcion}
            onChange={(e) => setDescr(e.target.value)}
            rows={3}
            placeholder="Detalles adicionales (opcional)…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />

          <div className="flex gap-3 mt-5">
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
              onClick={handleSubmit}
              disabled={loading || !motivo}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700
                         text-white font-semibold rounded-xl py-2.5 text-sm transition-colors
                         disabled:opacity-50 shadow-sm shadow-red-200"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar reporte
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
