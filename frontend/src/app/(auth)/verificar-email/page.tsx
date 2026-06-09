"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, ApolloError } from "@apollo/client";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { VERIFY_EMAIL } from "@/graphql/auth/mutations";

type Estado = "verificando" | "exito" | "error";

export default function VerificarEmailPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token");

  const [estado, setEstado]   = useState<Estado>("verificando");
  const [mensaje, setMensaje] = useState("");

  const [verifyEmail] = useMutation(VERIFY_EMAIL);

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setMensaje("El enlace de verificación no es válido.");
      return;
    }

    verifyEmail({ variables: { token } })
      .then(() => {
        setEstado("exito");
        setTimeout(() => router.push("/login"), 3000);
      })
      .catch((err: unknown) => {
        setEstado("error");
        const msg = err instanceof ApolloError
          ? (err.graphQLErrors[0]?.message ?? "El enlace expiró o ya fue usado.")
          : "El enlace expiró o ya fue usado.";
        setMensaje(msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8 text-center">
      {estado === "verificando" && (
        <>
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Verificando tu email…</h2>
          <p className="text-sm text-slate-500">Un momento por favor.</p>
        </>
      )}

      {estado === "exito" && (
        <>
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">¡Email verificado!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Tu cuenta está activa. Redirigiendo al login en 3 segundos…
          </p>
          <Link
            href="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors shadow-sm shadow-indigo-200"
          >
            Ir al login ahora
          </Link>
        </>
      )}

      {estado === "error" && (
        <>
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Verificación fallida</h2>
          <p className="text-sm text-slate-500 mb-6">{mensaje}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Link>
        </>
      )}
    </div>
  );
}
