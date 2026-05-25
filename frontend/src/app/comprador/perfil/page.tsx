"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useAuth } from "@/context/auth-context";
import { UPDATE_PASSWORD } from "@/graphql/auth/mutations";
import { User, Lock, Mail, Phone, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

export default function CompradorPerfilPage() {
  const { user } = useAuth();

  const [form, setForm] = useState({ passwordActual: "", nuevaPassword: "", confirmar: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  const [updatePassword] = useMutation(UPDATE_PASSWORD);

  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    if (form.nuevaPassword !== form.confirmar) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (form.nuevaPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword({
        variables: { passwordActual: form.passwordActual, nuevaPassword: form.nuevaPassword },
      });
      setSuccess(true);
      setForm({ passwordActual: "", nuevaPassword: "", confirmar: "" });
      toast.success("Contraseña actualizada correctamente.");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error al cambiar contraseña.") : "Error.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-sm text-slate-400 mt-0.5">Información de tu cuenta</p>
      </div>

      <div className="space-y-5">
        {/* Información personal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Información personal</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Nombre completo</p>
                <p className="text-sm font-semibold text-slate-900">
                  {user?.perfilComprador?.nombreCompleto ?? "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                </div>
                <p className="text-sm text-slate-700 truncate">{user?.email ?? "—"}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className={`h-3.5 w-3.5 ${user?.verificado ? "text-emerald-500" : "text-slate-300"}`} />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</p>
                </div>
                <p className={`text-sm font-semibold ${user?.verificado ? "text-emerald-600" : "text-amber-600"}`}>
                  {user?.verificado ? "Cuenta verificada" : "Pendiente de verificación"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Cambiar contraseña</h2>
          </div>

          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Contraseña actual
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  required
                  type="password"
                  value={form.passwordActual}
                  onChange={(e) => setForm((p) => ({ ...p, passwordActual: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.nuevaPassword}
                  onChange={(e) => setForm((p) => ({ ...p, nuevaPassword: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  required
                  type="password"
                  value={form.confirmar}
                  onChange={(e) => setForm((p) => ({ ...p, confirmar: e.target.value }))}
                  placeholder="Repite la nueva contraseña"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                         text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors
                         shadow-sm shadow-indigo-200"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Actualizando…</>
                : success
                ? <><CheckCircle className="h-4 w-4" /> Actualizada</>
                : <><Lock className="h-4 w-4" /> Cambiar contraseña</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
