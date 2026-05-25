"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { REQUEST_PASSWORD_RESET } from "@/graphql/auth/mutations";

const schema = z.object({
  email: z.email("Email inválido"),
});

type FormData = z.infer<typeof schema>;

export default function RecuperarPasswordPage() {
  const [enviado, setEnviado]         = useState(false);
  const [emailEnviado, setEmailEnviado] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const [requestReset] = useMutation(REQUEST_PASSWORD_RESET);

  const onSubmit = async (data: FormData) => {
    try {
      await requestReset({ variables: { email: data.email } });
      setEmailEnviado(data.email);
      setEnviado(true);
    } catch {
      toast.error("Error al procesar la solicitud. Intenta nuevamente.");
    }
  };

  if (enviado) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-7 w-7 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Revisa tu email</h2>
        <p className="text-sm text-slate-500 mb-1">Enviamos un enlace de restablecimiento a:</p>
        <p className="text-sm font-semibold text-slate-800 mb-6">{emailEnviado}</p>
        <p className="text-xs text-slate-400 mb-6">El enlace expira en 2 horas. Revisa también tu carpeta de spam.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recuperar contraseña</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ingresa tu email y te enviamos un enlace para restablecer tu acceso.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <p className="text-center mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </Link>
      </p>
    </div>
  );
}
