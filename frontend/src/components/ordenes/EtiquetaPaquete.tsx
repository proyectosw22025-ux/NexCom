"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Package, ShieldCheck } from "lucide-react";

/**
 * Etiqueta del paquete para el VENDEDOR: QR único de la orden (+ código impreso
 * como respaldo) para imprimir y pegar en la caja antes de enviarla. El cliente
 * la escaneará al recibir para liberar el pago retenido.
 */
export function EtiquetaPaquete({ ordenId, codigo, destinatario, ciudad }:
  { ordenId: string; codigo: string; destinatario?: string | null; ciudad?: string | null }) {
  const areaRef = useRef<HTMLDivElement>(null);

  // Impresión aislada: abre una ventana solo con la etiqueta (sin tocar la app)
  function imprimir() {
    const contenido = areaRef.current?.innerHTML ?? "";
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Etiqueta ${ordenId.slice(-8).toUpperCase()}</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;padding:24px}
      .et{border:2px dashed #94a3b8;border-radius:16px;padding:24px;text-align:center;max-width:320px}</style>
      </head><body><div class="et">${contenido}</div><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" /> Etiqueta del paquete
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Imprime esta etiqueta y pégala en la caja <strong>antes de enviarla</strong>. El cliente
            escaneará el QR al recibir el paquete y recién entonces se libera tu pago.
          </p>
        </div>
        <button
          onClick={imprimir}
          className="shrink-0 flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50
                     font-semibold px-3 py-2 rounded-xl text-xs transition-colors"
        >
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </button>
      </div>

      {/* Contenido imprimible */}
      <div ref={areaRef} className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center max-w-xs mx-auto">
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#334155", margin: 0 }}>
          NEXCOM · COMPRA PROTEGIDA
        </p>
        <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 12px" }}>
          Orden #{ordenId.slice(-8).toUpperCase()}
          {destinatario ? ` · ${destinatario}` : ""}{ciudad ? ` · ${ciudad}` : ""}
        </p>
        <div style={{ display: "inline-block", background: "#fff", padding: 10, borderRadius: 12 }}>
          <QRCodeSVG value={codigo} size={150} level="M" />
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: 6, color: "#0f172a", margin: "10px 0 2px" }}>
          {codigo}
        </p>
        <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>
          El destinatario escanea este código al recibir para confirmar la entrega
        </p>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5 justify-center">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        El código es único para esta orden y de un solo uso.
      </p>
    </div>
  );
}
