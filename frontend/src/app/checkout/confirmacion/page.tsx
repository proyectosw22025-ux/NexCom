"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ShoppingBag, Package } from "lucide-react";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";

function ConfirmacionContent() {
  const params  = useSearchParams();
  const status  = params.get("status");
  const ordenId = params.get("ordenId");
  const count   = parseInt(params.get("count") ?? "1", 10) || 1;
  const varios  = count > 1;
  const ok      = status === "ok";

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <CheckoutStepper current="confirmacion" success={ok} />

      <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-5">
        {ok && <span className="absolute inset-0 rounded-2xl bg-emerald-300 animate-ping opacity-50" />}
        <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center animate-pop-in ${
          ok ? "bg-emerald-100" : "bg-red-100"
        }`}>
          {ok
            ? <CheckCircle className="h-9 w-9 text-emerald-600" />
            : <XCircle    className="h-9 w-9 text-red-500" />
          }
        </div>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {ok ? "¡Pago exitoso!" : "Pago no completado"}
      </h1>

      <p className="text-sm text-slate-500 mb-2">
        {ok
          ? (varios
              ? `Tu compra se dividió en ${count} pedidos (uno por tienda) y cada vendedor fue notificado.`
              : "Tu pedido fue registrado y el vendedor fue notificado.")
          : "Ocurrió un problema al procesar tu pago. No se realizó ningún cargo."
        }
      </p>

      {ordenId && !varios && (
        <p className="text-xs text-slate-400 font-mono mb-8">
          Pedido #{ordenId.slice(-6).toUpperCase()}
        </p>
      )}
      {varios && <div className="mb-8" />}

      <div className="flex flex-col gap-3">
        {ok && (varios ? (
          <Link
            href="/cliente/ordenes"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                       text-white font-semibold rounded-xl py-3 text-sm transition-colors shadow-sm shadow-indigo-200"
          >
            <Package className="h-4 w-4" /> Ver mis pedidos
          </Link>
        ) : ordenId && (
          <Link
            href={`/cliente/ordenes/${ordenId}`}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                       text-white font-semibold rounded-xl py-3 text-sm transition-colors
                       shadow-sm shadow-indigo-200"
          >
            <Package className="h-4 w-4" />
            Ver mi pedido
          </Link>
        ))}
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
