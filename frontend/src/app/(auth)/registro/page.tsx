"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, ApolloError } from "@apollo/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Store, ShoppingBag, Mail, Lock, User, Phone } from "lucide-react";
import { REGISTER } from "@/graphql/auth/mutations";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type Rol = "VENDEDOR" | "COMPRADOR";

const baseSchema = z.object({
  email:           z.email("Email inválido"),
  password:        z.string().min(8, "Mínimo 8 caracteres").regex(/\d/, "Debe contener al menos un número"),
  confirmPassword: z.string(),
  rol:             z.enum(["VENDEDOR", "COMPRADOR"]),
  nombreNegocio:   z.string().optional(),
  nombreCompleto:  z.string().optional(),
  telefono:        z.string().optional(),
});

const schema = baseSchema.superRefine((d, ctx) => {
  if (d.password !== d.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Las contraseñas no coinciden" });
  }
  if (d.rol === "VENDEDOR" && !d.nombreNegocio?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nombreNegocio"], message: "El nombre del negocio es requerido" });
  }
  if (d.rol === "COMPRADOR" && !d.nombreCompleto?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nombreCompleto"], message: "Tu nombre completo es requerido" });
  }
});

type FormData = z.infer<typeof schema>;

const inputClass = "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all";
const iconClass  = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none";
const labelClass = "block text-xs font-semibold text-slate-700 uppercase tracking-wide";

export default function RegistroPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>("COMPRADOR");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { rol: "COMPRADOR" } });

  const [registerMutation] = useMutation(REGISTER);

  const selectRol = (rol: Rol) => { setRolSeleccionado(rol); setValue("rol", rol); };

  const onSubmit = async (data: FormData) => {
    try {
      const input: Record<string, unknown> = { email: data.email, password: data.password, rol: data.rol };
      if (data.rol === "VENDEDOR") input.datosVendedor  = { nombreNegocio: data.nombreNegocio,  telefono: data.telefono };
      else                         input.datosComprador = { nombreCompleto: data.nombreCompleto, telefono: data.telefono };

      const result  = await registerMutation({ variables: { input } });
      const payload = result.data?.register;
      if (!payload) throw new Error("Respuesta inesperada.");

      login(payload.accessToken, payload.refreshToken, payload.usuario);
      toast.success("¡Cuenta creada! Bienvenido a NexCom.", {
        description: "Tu cuenta ya está lista para usarse.",
        duration: 5000,
      });
      router.push(data.rol === "VENDEDOR" ? "/vendedor" : "/productos");

    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al crear la cuenta.")
        : "Error al crear la cuenta.";
      toast.error(msg);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Crear cuenta</h2>
        <p className="text-sm text-slate-500 mt-1">Únete al marketplace de Santa Cruz</p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(["COMPRADOR", "VENDEDOR"] as Rol[]).map((rol) => (
          <button
            key={rol}
            type="button"
            onClick={() => selectRol(rol)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              rolSeleccionado === rol
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {rol === "COMPRADOR"
              ? <ShoppingBag className="h-5 w-5" />
              : <Store className="h-5 w-5" />}
            <span className="text-xs font-semibold">
              {rol === "COMPRADOR" ? "Comprador" : "Vendedor"}
            </span>
            <span className="text-[10px] text-center leading-tight opacity-70">
              {rol === "COMPRADOR" ? "Compra productos locales" : "Vende tu catálogo"}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("rol")} />

        {/* Conditional name field */}
        <div className="space-y-1.5">
          <label className={labelClass}>
            {rolSeleccionado === "VENDEDOR" ? "Nombre del negocio" : "Nombre completo"}
          </label>
          <div className="relative">
            {rolSeleccionado === "VENDEDOR"
              ? <Store className={iconClass} />
              : <User  className={iconClass} />}
            {rolSeleccionado === "VENDEDOR" ? (
              <input
                {...register("nombreNegocio")}
                className={inputClass}
                placeholder="Ej: Boutique Valentina"
              />
            ) : (
              <input
                {...register("nombreCompleto")}
                className={inputClass}
                placeholder="Tu nombre completo"
              />
            )}
          </div>
          {(errors.nombreNegocio || errors.nombreCompleto) && (
            <p className="text-red-500 text-xs">
              {errors.nombreNegocio?.message ?? errors.nombreCompleto?.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className={labelClass}>Email</label>
          <div className="relative">
            <Mail className={iconClass} />
            <input {...register("email")} type="email" autoComplete="email"
              placeholder="tu@email.com" className={inputClass} />
          </div>
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        {/* Telefono (optional) */}
        <div className="space-y-1.5">
          <label className={labelClass}>
            Teléfono <span className="text-slate-400 normal-case font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <Phone className={iconClass} />
            <input {...register("telefono")} type="tel" placeholder="+591 7XXXXXXX" className={inputClass} />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className={labelClass}>Contraseña</label>
          <div className="relative">
            <Lock className={iconClass} />
            <input {...register("password")} type="password" autoComplete="new-password"
              placeholder="Mínimo 8 caracteres y un número" className={inputClass} />
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className={labelClass}>Confirmar contraseña</label>
          <div className="relative">
            <Lock className={iconClass} />
            <input {...register("confirmPassword")} type="password" autoComplete="new-password"
              placeholder="Repite tu contraseña" className={inputClass} />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 mt-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creando cuenta…" : "Crear cuenta gratis"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-5">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
