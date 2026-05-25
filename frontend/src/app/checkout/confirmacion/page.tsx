"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ShoppingBag, Package } from "lucide-react";

function ConfirmacionContent() {
  const params  = useSearchParams();
  const status  = params.get("status");
  const ordenId = params.get("ordenId");
  const ok      = status === "ok";

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
        ok ? "bg-emerald-100" : "bg-red-100"
      }`}>
        {ok
          ? <CheckCircle className="h-8 w-8 text-emerald-600" />
          : <XCircle    className="h-8 w-8 text-red-500" />
        }
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {ok ? "¡Pago exitoso!" : "Pago no completado"}
      </h1>

      <p className="text-sm text-slate-500 mb-2">
        {ok
          ? "Tu orden fue registrada y el vendedor fue notificado."
          : "Ocurrió un problema al procesar tu pago. No se realizó ningún cargo."
        }
      </p>

      {ordenId && (
        <p className="text-xs text-slate-400 font-mono mb-8">
          Orden #{ordenId.slice(-6).toUpperCase()}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {ok && ordenId && (
          <Link
            href={`/comprador/ordenes/${ordenId}`}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                       text-white font-semibold rounded-xl py-3 text-sm transition-colors
                       shadow-sm shadow-indigo-200"
          >
            <Package className="h-4 w-4" />
            Ver mi orden
          </Link>
        )}
        {!ok && (
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                       text-white font-semibold rounded-xl py-3 text-sm transition-colors
                       shadow-sm shadow-indigo-200"
          >
            Intentar de nuevo
          </Link>
        )}
        <Link
          href="/productos"
          className="inline-flex items-center justify-center gap-2 border border-slate-200
                     text-slate-700 font-semibold rounded-xl py-3 text-sm hover:bg-slate-50 transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense>
      <ConfirmacionContent />
    </Suspense>
  );
}
