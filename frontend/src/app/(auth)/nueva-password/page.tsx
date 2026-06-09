"use client";

export const dynamic = "force-dynamic";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, ApolloError } from "@apollo/client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { RESET_PASSWORD } from "@/graphql/auth/mutations";

const schema = z
  .object({
    password:        z.string().min(8, "Mínimo 8 caracteres").regex(/\d/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path:    ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

type FormData = z.infer<typeof schema>;

const inputClass = "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all";
const iconClass  = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none";

export default function NuevaPasswordPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const [resetPassword] = useMutation(RESET_PASSWORD);

  const onSubmit = async (data: FormData) => {
    if (!token) { toast.error("El enlace no es válido."); return; }
    try {
      await resetPassword({ variables: { token, nuevaPassword: data.password } });
      toast.success("¡Contraseña restablecida! Ya puedes iniciar sesión.", { duration: 5000 });
      router.push("/login");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "El enlace expiró o no es válido.")
        : "El enlace expiró o no es válido.";
      toast.error(msg);
    }
  };

  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Enlace inválido</h2>
        <p className="text-sm text-slate-500 mb-6">El enlace de restablecimiento no es válido o expiró.</p>
        <Link
          href="/recuperar-password"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Nueva contraseña</h2>
        <p className="text-sm text-slate-500 mt-1">Elige una contraseña segura para tu cuenta.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock className={iconClass} />
            <input {...register("password")} type="password" autoComplete="new-password"
              placeholder="Mínimo 8 caracteres y un número" className={inputClass} />
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Confirmar contraseña
          </label>
          <div className="relative">
            <Lock className={iconClass} />
            <input {...register("confirmPassword")} type="password" autoComplete="new-password"
              placeholder="Repite tu nueva contraseña" className={inputClass} />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Guardando…" : "Restablecer contraseña"}
        </button>
      </form>
    </div>
  );
}
