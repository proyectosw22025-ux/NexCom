"use client";

import { ShieldCheck, ScanLine } from "lucide-react";

/**
 * Estado de la garantía para el CLIENTE. No muestra ningún código: la prueba
 * de entrega es escanear el QR físico que viaja pegado al paquete (posesión +
 * identidad). Solo informa que el pago está protegido y cómo confirmar.
 */
export function CompraProtegidaCard({ estado, autoLiberaEn }:
  { estado: string; autoLiberaEn: string | null }) {
  const dias = autoLiberaEn
    ? Math.max(0, Math.ceil((new Date(autoLiberaEn).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="surface-emerald relative overflow-hidden rounded-2xl border border-emerald-200 p-5">
      <div className="pointer-events-none absolute -top-10 -right-8 w-36 h-36 rounded-full bg-emerald-100/60 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">Compra Protegida</h2>
          <p className="text-xs text-emerald-700 mt-0.5">
            Tu pago está retenido en garantía: el vendedor lo recibe recién cuando confirmes la entrega.
          </p>
          <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
            <ScanLine className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            {estado === "ENVIADO"
              ? "Tu paquete trae un código QR: al recibirlo, escanéalo desde \"Recoger pedido\" para liberar el pago."
              : "Cuando tu pedido sea enviado, el paquete traerá un código QR para confirmar la entrega al recibirlo."}
          </p>
          {estado === "ENVIADO" && dias !== null && (
            <p className="text-[11px] text-slate-400 mt-2">
              Si no confirmas, el pago se libera automáticamente en {dias} día{dias !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
