"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, ApolloError } from "@apollo/client";
import Link from "next/link";
import { QrCode, Landmark, Loader2, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { CONFIRMAR_PAGO_SIMULADO } from "@/graphql/pagos/mutations";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";

interface CheckoutData { ordenIds: string[]; metodoPago: string; total: string }

// Datos bancarios de demostración (simulado)
const CUENTA = {
  banco: "Banco Unión", numero: "1-0000-1234567", titular: "NexCom Bolivia S.R.L.", nit: "1023456789",
};

export default function PagoPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmarPago, { loading }] = useMutation(CONFIRMAR_PAGO_SIMULADO);

  useEffect(() => {
    const raw = sessionStorage.getItem("nexcom_checkout");
    if (!raw) { router.replace("/checkout"); return; }
    try { setData(JSON.parse(raw)); } catch { router.replace("/checkout"); }
    setHydrated(true);
  }, [router]);

  async function handleConfirmar() {
    if (!data) return;
    try {
      await confirmarPago({ variables: { ordenIds: data.ordenIds } });
      sessionStorage.removeItem("nexcom_checkout");
      router.push(`/checkout/confirmacion?ordenId=${data.ordenIds[0]}&count=${data.ordenIds.length}&status=ok`);
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  if (!hydrated || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Preparando pago…</p>
      </div>
    );
  }

  const esQR = data.metodoPago === "qr";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `NEXCOM-PAGO|orden:${data.ordenIds[0]}|monto:${data.total}|moneda:BOB`,
  )}`;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <CheckoutStepper current="pago" />

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          {esQR ? <QrCode className="h-5 w-5 text-indigo-600" /> : <Landmark className="h-5 w-5 text-indigo-600" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">{esQR ? "Paga con QR Simple" : "Transferencia bancaria"}</h1>
        <p className="text-sm text-slate-400 mt-1">Monto a pagar: <span className="font-bold text-slate-700">Bs. {data.total}</span></p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {esQR ? (
          <div className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR de pago" width={220} height={220} className="rounded-xl border border-slate-200" />
            <p className="text-sm text-slate-600 mt-4">
              Escanea este código con la app de tu banco o billetera (Tigo Money, Soli, etc.) y confirma el pago de <strong>Bs. {data.total}</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Transfiere <strong>Bs. {data.total}</strong> a la siguiente cuenta:</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100 text-sm">
              {[
                ["Banco", CUENTA.banco],
                ["N° de cuenta", CUENTA.numero],
                ["Titular", CUENTA.titular],
                ["NIT", CUENTA.nit],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    {v}
                    <button onClick={() => { navigator.clipboard?.writeText(v); toast.success("Copiado"); }}
                      className="p-0.5 rounded hover:bg-slate-200 transition-colors">
                      <Copy className="h-3 w-3 text-slate-400" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Guarda tu comprobante. El vendedor verificará la transferencia.</p>
          </div>
        )}

        <button
          onClick={handleConfirmar}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors
                     shadow-sm shadow-emerald-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {esQR ? "Ya pagué con QR" : "Ya realicé la transferencia"}
        </button>
      </div>

      <div className="text-center mt-5">
        <Link href="/checkout" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Volver al resumen
        </Link>
      </div>

      <p className="text-xs text-slate-400 text-center mt-4">Pago simulado para demostración · NexCom Bolivia</p>
    </div>
  );
}
