"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, ApolloError } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Mail, Lock } from "lucide-react";
import { LOGIN } from "@/graphql/auth/mutations";
import { useAuth } from "@/context/auth-context";

const schema = z.object({
  email:    z.email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const [loginMutation] = useMutation(LOGIN);

  const onSubmit = async (data: FormData) => {
    try {
      const result  = await loginMutation({ variables: { email: data.email, password: data.password } });
      const payload = result.data?.login;
      if (!payload) throw new Error("Respuesta inesperada.");

      login(payload.accessToken, payload.refreshToken, payload.usuario);
      toast.success("Bienvenido de vuelta");

      const redirect = searchParams.get("redirect");
      if (redirect) { router.push(redirect); return; }
      const rol = payload.usuario.rol;
      if (rol === "ADMIN")         router.push("/admin");
      else if (rol === "VENDEDOR") router.push("/vendedor");
      else                         router.push("/comprador");

    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al iniciar sesión.")
        : "Error al iniciar sesión.";
      if (msg.includes("verificar tu email")) {
        toast.warning(msg, { description: "Revisa tu bandeja de entrada." });
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenido de vuelta</h2>
        <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para continuar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
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

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Contraseña
            </label>
            <Link href="/recuperar-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-400">¿Nuevo en NexCom?</span>
        </div>
      </div>

      <Link
        href="/registro"
        className="block w-full text-center border border-slate-200 text-slate-700 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors"
      >
        Crear cuenta gratis
      </Link>
    </div>
  );
}
