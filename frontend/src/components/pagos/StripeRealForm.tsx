"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, ApolloError } from "@apollo/client";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CREAR_PAYMENT_INTENT } from "@/graphql/pagos/mutations";
import { getStripe } from "@/lib/stripe";

/**
 * Pago con tarjeta REAL vía Stripe (rol: Payments Engineer):
 *   1. crearPaymentIntent (backend, monto server-side) → clientSecret + ordenId
 *   2. PaymentElement (los datos de tarjeta viven en un iframe de Stripe,
 *      jamás tocan nuestro backend — PCI a cargo de Stripe)
 *   3. confirmPayment → el webhook firma la confirmación server-side
 *      (PAGADO + retención en garantía + QR del paquete + puntos).
 */
export function StripeRealForm({ direccionId, cuponCodigo }:
  { direccionId: string; cuponCodigo: string | null }) {
  const [crear] = useMutation(CREAR_PAYMENT_INTENT);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [ordenId, setOrdenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data } = await crear({ variables: { direccionId, cuponCodigo } });
        if (!activo) return;
        setClientSecret(data.crearPaymentIntent.clientSecret);
        setOrdenId(data.crearPaymentIntent.ordenId);
      } catch (err) {
        setError(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "No se pudo iniciar el pago.") : "No se pudo iniciar el pago.");
      }
    })();
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-red-600 text-center py-8">{error}</p>;
  if (!clientSecret || !ordenId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="text-xs text-slate-400">Preparando pago seguro…</p>
      </div>
    );
  }

  return (
    <Elements stripe={getStripe()} options={{ clientSecret, locale: "es" }}>
      <FormularioInterno ordenId={ordenId} />
    </Elements>
  );
}

function FormularioInterno({ ordenId }: { ordenId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [pagando, setPagando] = useState(false);

  async function handlePagar() {
    if (!stripe || !elements) return;
    setPagando(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/confirmacion?ordenId=${ordenId}&count=1&status=ok`,
      },
      redirect: "if_required", // tarjetas sin 3DS confirman sin salir de la página
    });
    if (error) {
      toast.error(error.message ?? "El pago no pudo procesarse.");
      setPagando(false);
      return;
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      toast.success("¡Pago procesado!");
      router.push(`/checkout/confirmacion?ordenId=${ordenId}&count=1&status=ok`);
    } else {
      setPagando(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        onClick={handlePagar}
        disabled={!stripe || pagando}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                   disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm
                   transition-colors shadow-sm shadow-indigo-200"
      >
        {pagando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Pagar de forma segura
      </button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Procesado por Stripe — tus datos de tarjeta nunca pasan por NexCom
      </p>
    </div>
  );
}
