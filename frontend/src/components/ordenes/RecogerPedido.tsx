"use client";

import { useState } from "react";
import { useMutation, ApolloError } from "@apollo/client";
import { PackageCheck, Loader2, ScanLine, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { INICIAR_RECOJO, CONFIRMAR_RECOJO, MARCAR_ORDEN_ENTREGADA } from "@/graphql/ordenes/mutations";
import { QrScannerRecojo } from "./QrScannerRecojo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Flujo "Recoger pedido" del comprador (orden ENVIADA):
 *   1. iniciarRecojo → OTP temporal (2º factor de la sesión de escaneo)
 *   2. escanear el QR físico del paquete (o código manual)
 *   3. confirmarRecojo → backend valida las 5 condiciones → entrega + libera fondos
 * Respaldo sin paquete escaneable: confirmación manual (marcarOrdenEntregada).
 */
export function RecogerPedido({ ordenId, onEntregado }: { ordenId: string; onEntregado: () => void }) {
  const [iniciar, { loading: iniciando }]     = useMutation(INICIAR_RECOJO);
  const [confirmar, { loading: validando }]   = useMutation(CONFIRMAR_RECOJO);
  const [marcarManual, { loading: marcando }] = useMutation(MARCAR_ORDEN_ENTREGADA);
  const [otp, setOtp] = useState<string | null>(null); // sesión de recojo activa → escáner abierto

  const msgDe = (err: unknown) =>
    err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";

  async function handleIniciar() {
    try {
      const { data } = await iniciar({ variables: { id: ordenId } });
      setOtp(data.iniciarRecojo.otp);
    } catch (err) { toast.error(msgDe(err)); }
  }

  async function handleCodigo(codigoQr: string) {
    try {
      await confirmar({ variables: { id: ordenId, codigoQr, otp } });
      setOtp(null);
      toast.success("¡Entrega confirmada! 🎉", { description: "El pago fue liberado al vendedor. Gracias por tu compra." });
      onEntregado();
    } catch (err) {
      toast.error(msgDe(err));
      setOtp(null); // cierra el escáner; el usuario puede reintentar (nuevo OTP)
    }
  }

  async function handleManual() {
    try {
      await marcarManual({ variables: { id: ordenId } });
      toast.success("¡Pedido confirmado como entregado!");
      onEntregado();
    } catch (err) { toast.error(msgDe(err)); }
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 p-6">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1.5 flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-emerald-600" /> ¿Ya tienes tu paquete?
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Escanea el <strong>código QR pegado en el paquete</strong> para confirmar la entrega
        y liberar el pago retenido al vendedor.
      </p>

      <button
        onClick={handleIniciar}
        disabled={iniciando || validando}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                   disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm
                   transition-colors shadow-sm shadow-emerald-200"
      >
        {iniciando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        Recoger pedido — escanear QR
      </button>

      <ConfirmDialog
        title="Confirmar sin escanear"
        description="¿Confirmas que recibiste tu pedido? Esto liberará el pago retenido al vendedor y no se puede deshacer."
        confirmLabel="Sí, lo recibí"
        onConfirm={handleManual}
        trigger={
          <button
            disabled={marcando}
            className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold
                       text-slate-400 hover:text-slate-600 py-1.5 transition-colors"
          >
            {marcando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            ¿No puedes escanear? Confirmar manualmente
          </button>
        }
      />

      {otp && (
        <QrScannerRecojo onCodigo={handleCodigo} onClose={() => setOtp(null)} procesando={validando} />
      )}
    </div>
  );
}
