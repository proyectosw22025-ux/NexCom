"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { CONFIGURACION_SISTEMA } from "@/graphql/admin/queries";
import { ACTUALIZAR_CONFIG } from "@/graphql/admin/mutations";
import { Settings, Loader2, CheckCircle, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface ConfigSistema {
  clave: string; valor: string; tipo: string; descripcion: string; actualizadoEn: string;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ConfigRow({ config, onSave }: { config: ConfigSistema; onSave: (clave: string, valor: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [valor, setValor]     = useState(config.valor);
  const [saving, setSaving]   = useState(false);

  const esBoolean = config.tipo === "BOOLEAN";
  const esNumber  = config.tipo === "NUMBER";

  async function persist(nuevoValor: string) {
    if (nuevoValor === config.valor) { setEditing(false); return; }
    setSaving(true);
    await onSave(config.clave, nuevoValor);
    setSaving(false);
    setEditing(false);
  }

  // BOOLEAN: toggle siempre visible que guarda al instante (sin modo edición)
  async function handleToggle() {
    const next = config.valor === "true" ? "false" : "true";
    setSaving(true);
    await onSave(config.clave, next);
    setSaving(false);
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-5 py-3.5">
        <p className="font-mono text-xs font-semibold text-slate-700">{config.clave}</p>
        <p className="text-xs text-slate-400 mt-0.5">{config.descripcion}</p>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
          {config.tipo}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {esBoolean ? (
          <button
            type="button"
            role="switch"
            aria-checked={config.valor === "true"}
            disabled={saving}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              config.valor === "true" ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                config.valor === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        ) : editing ? (
          <input
            type={esNumber ? "number" : "text"}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") persist(valor); if (e.key === "Escape") { setValor(config.valor); setEditing(false); } }}
            autoFocus
            className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        ) : (
          <span className="text-sm font-semibold text-slate-900">{config.valor}</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-xs text-slate-400 hidden sm:table-cell">
        {formatFecha(config.actualizadoEn)}
      </td>
      <td className="px-5 py-3.5 text-right">
        {esBoolean ? (
          saving ? <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin ml-auto" /> : null
        ) : editing ? (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={() => persist(valor)}
              disabled={saving}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40"
            >
              {saving
                ? <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                : <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              }
            </button>
            <button
              onClick={() => { setValor(config.valor); setEditing(false); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-indigo-500" />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function AdminConfiguracionPage() {
  const { data, loading, refetch } = useQuery<{ configuracionSistema: ConfigSistema[] }>(
    CONFIGURACION_SISTEMA, { fetchPolicy: "cache-and-network" },
  );

  const [actualizarConfig] = useMutation(ACTUALIZAR_CONFIG);

  const configs = data?.configuracionSistema ?? [];

  async function handleSave(clave: string, valor: string) {
    try {
      await actualizarConfig({ variables: { clave, valor } });
      toast.success(`Configuración "${clave}" actualizada.`);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h1>
        <p className="text-sm text-slate-400 mt-0.5">Parámetros dinámicos — los cambios se aplican sin reiniciar el servidor</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando configuración…</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <Settings className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Sin configuraciones</p>
          <p className="text-sm text-slate-400 mt-1">
            Ejecuta el seed de la base de datos para poblar los parámetros del sistema.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">{configs.length} parámetros configurados</p>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Clave / Descripción</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Actualizado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {configs.map((c) => (
                <ConfigRow key={c.clave} config={c} onSave={handleSave} />
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <div className="mt-6 bg-slate-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Nota técnica</p>
        </div>
        <p className="text-sm text-slate-300">
          Los valores se validan según su tipo (NUMBER, BOOLEAN, STRING, JSON). Los cambios son inmediatos
          — el módulo de configuración invalida el caché de Redis automáticamente al actualizar.
        </p>
      </div>
    </div>
  );
}
