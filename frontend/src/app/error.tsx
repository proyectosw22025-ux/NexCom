"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // En producción esto se enviaría a un servicio de error tracking (ver plan: Sentry)
    console.error("[App error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">Algo salió mal</h1>
      <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
        Ocurrió un error inesperado. Puedes intentar de nuevo; si el problema persiste, vuelve más tarde.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono mt-3">Ref: {error.digest}</p>
      )}
      <div className="flex items-center gap-3 mt-7">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          <RotateCcw className="h-4 w-4" /> Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 text-slate-700
                     text-sm font-semibold rounded-xl hover:bg-white transition-colors"
        >
          <Home className="h-4 w-4" /> Ir al inicio
        </Link>
      </div>
    </div>
  );
}
