"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Lock, Loader2, CreditCard } from "lucide-react";
import Link from "next/link";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const CARD_STYLE = {
  style: {
    base: {
      fontSize:        "14px",
      color:           "#0f172a",
      fontFamily:      "system-ui, sans-serif",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#ef4444" },
  },
};

function PagoForm({ clientSecret, ordenId }: { clientSecret: string; ordenId: string }) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const [pagando, setPagando]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setPagando(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) { setPagando(false); return; }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    setPagando(false);

    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar el pago.");
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      sessionStorage.removeItem("nexcom_checkout");
      router.push(`/checkout/confirmacion?ordenId=${ordenId}&status=ok`);
    } else {
      router.push(`/checkout/confirmacion?ordenId=${ordenId}&status=error`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Datos de tarjeta
        </label>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <CardElement options={CARD_STYLE} />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Tarjeta de prueba: <span className="font-mono">4242 4242 4242 4242</span> · CVC: <span className="font-mono">cualquier</span> · Fecha futura
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || pagando}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                   disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold
                   rounded-xl py-3 text-sm transition-colors shadow-sm shadow-indigo-200"
      >
        {pagando
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando pago…</>
          : <><CreditCard className="h-4 w-4" /> Pagar ahora</>
        }
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3.5 w-3.5" />
        Pago seguro con cifrado SSL · Stripe Sandbox
      </div>
    </form>
  );
}

export default function PagoPage() {
  const router = useRouter();
  const [checkoutData, setCheckoutData] = useState<{ clientSecret: string; ordenId: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("nexcom_checkout");
    if (!raw) {
      router.replace("/checkout");
      return;
    }
    try {
      setCheckoutData(JSON.parse(raw));
    } catch {
      router.replace("/checkout");
    }
    setHydrated(true);
  }, [router]);

  if (!hydrated || !checkoutData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Preparando pago…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <CheckoutStepper current="pago" />

      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Lock className="h-5 w-5 text-indigo-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Pago seguro</h1>
        <p className="text-sm text-slate-400 mt-1">Ingresa los datos de tu tarjeta</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.clientSecret }}>
          <PagoForm
            clientSecret={checkoutData.clientSecret}
            ordenId={checkoutData.ordenId}
          />
        </Elements>
      </div>

      <div className="text-center mt-5">
        <Link href="/checkout" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Volver al resumen
        </Link>
      </div>
    </div>
  );
}
