"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, Keyboard, Loader2, ScanLine } from "lucide-react";

/**
 * Escáner del QR del paquete (flujo de recojo). Responsabilidad única: capturar
 * un código (cámara vía BarcodeDetector, o ingreso manual como respaldo) y
 * entregarlo al padre. No conoce órdenes ni mutaciones (inversión de dependencias).
 */
interface Props {
  onCodigo: (codigo: string) => void; // se invoca UNA vez con el código capturado
  onClose: () => void;
  procesando: boolean;                // el padre está validando con el backend
}

// BarcodeDetector aún no está en los tipos de TS de todos los targets
interface DetectorQR {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => DetectorQR;
  }
}

export function QrScannerRecojo({ onCodigo, onClose, procesando }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectado = useRef(false); // evita entregar el código dos veces
  const [error, setError]   = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [codigoManual, setCodigoManual] = useState("");

  const soportaCamara =
    typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!soportaCamara || manual) return;
    let activo = true;
    let rafId = 0;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, audio: false,
        });
        if (!activo) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
        let ultimoScan = 0;
        const loop = async (t: number) => {
          if (!activo || detectado.current) return;
          if (t - ultimoScan > 250 && videoRef.current && videoRef.current.readyState >= 2) {
            ultimoScan = t;
            try {
              const codes = await detector.detect(videoRef.current);
              const valor = codes[0]?.rawValue?.trim();
              if (valor && !detectado.current) {
                detectado.current = true;
                onCodigo(valor);
                return;
              }
            } catch { /* frame no legible; continuar */ }
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch {
        setError("No se pudo acceder a la cámara. Puedes ingresar el código manualmente.");
      }
    })();

    return () => {
      activo = false;
      cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [soportaCamara, manual, onCodigo]);

  const usarManual = manual || !soportaCamara || !!error;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-emerald-600" /> Escanea el QR del paquete
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {!usarManual ? (
          <div className="relative aspect-square bg-slate-950">
            {/* El video no se refleja: es cámara trasera */}
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            {/* Marco guía */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />
            </div>
            {procesando && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                <p className="text-xs text-white/90">Validando entrega…</p>
              </div>
            )}
            <p className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/80">
              Apunta la cámara al código QR pegado en tu paquete
            </p>
          </div>
        ) : (
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-3">
              {error ?? "Tu navegador no soporta el escaneo con cámara."} Ingresa el código de 6 dígitos
              impreso debajo del QR de tu paquete:
            </p>
            <div className="flex gap-2">
              <input
                value={codigoManual}
                onChange={(e) => setCodigoManual(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold
                           tracking-[0.4em] tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
              <button
                onClick={() => { if (!detectado.current && codigoManual.length === 6) { detectado.current = true; onCodigo(codigoManual); } }}
                disabled={procesando || codigoManual.length < 6}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white
                           font-semibold px-4 rounded-xl text-sm transition-colors"
              >
                {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
              </button>
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          {!usarManual ? (
            <button onClick={() => setManual(true)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5" /> Ingresar código manualmente
            </button>
          ) : soportaCamara && !error ? (
            <button onClick={() => { setManual(false); }} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Usar la cámara
            </button>
          ) : <span />}
          <button onClick={onClose} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
