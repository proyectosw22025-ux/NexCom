"use client";

import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Info } from "lucide-react";

/**
 * Tarjeta "Compra Protegida" para el comprador: muestra el código de entrega
 * (PIN + QR) que debe presentar al recibir el producto para liberar el pago
 * retenido al vendedor. El código nunca se expone al vendedor por la API.
 */
export function CodigoEntregaCard({ codigo, estado, autoLiberaEn }:
  { codigo: string; estado: string; autoLiberaEn: string | null }) {
  const dias = autoLiberaEn
    ? Math.max(0, Math.ceil((new Date(autoLiberaEn).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="pointer-events-none absolute -top-10 -right-8 w-36 h-36 rounded-full bg-emerald-100/60 blur-2xl" />

      <div className="relative flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">Compra Protegida</h2>
          <p className="text-[11px] text-emerald-700">Tu pago está retenido en garantía</p>
        </div>
      </div>

      <div className="relative flex flex-col sm:flex-row items-center gap-5">
        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm shrink-0">
          <QRCodeSVG value={codigo} size={116} level="M" fgColor="#065f46" />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Código de entrega</p>
          <p className="text-3xl font-extrabold tracking-[0.3em] text-slate-900 tabular-nums">{codigo}</p>
          <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            {estado === "ENVIADO"
              ? "Muéstralo (o deja que lo escaneen) al recibir tu pedido. Recién entonces se libera el pago al vendedor."
              : "Lo necesitarás al recibir tu pedido para confirmar la entrega y liberar el pago al vendedor."}
          </p>
          {estado === "ENVIADO" && dias !== null && (
            <p className="text-[11px] text-slate-400 mt-2">
              Si no confirmas, se libera automáticamente en {dias} día{dias !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
