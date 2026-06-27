"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { EVENTOS_SEGURIDAD } from "@/graphql/admin/queries";
import { PageHero } from "@/components/ui/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { ShieldCheck, Loader2, ShieldAlert, LockKeyhole, Coins, Gavel } from "lucide-react";

interface Evento {
  id: string; tipo: string; usuarioId: string | null; ordenId: string | null;
  metadata: string | null; creadoEn: string;
}

// tipo → presentación (icono + tono + etiqueta legible)
const TIPO_UI: Record<string, { label: string; clase: string; icon: typeof ShieldCheck }> = {
  LOGIN_FALLIDO:          { label: "Login fallido",        clase: "text-amber-600 bg-amber-50",   icon: ShieldAlert },
  LOGIN_BLOQUEADO:        { label: "Cuenta bloqueada",     clase: "text-rose-600 bg-rose-50",     icon: LockKeyhole },
  INTENTO_CODIGO_FALLIDO: { label: "Código incorrecto",    clase: "text-amber-600 bg-amber-50",   icon: ShieldAlert },
  CODIGO_BLOQUEADO:       { label: "Código bloqueado",     clase: "text-rose-600 bg-rose-50",     icon: LockKeyhole },
  LIBERACION:             { label: "Fondos liberados",     clase: "text-emerald-600 bg-emerald-50", icon: Coins },
  LIBERACION_AUTO:        { label: "Liberación automática", clase: "text-sky-600 bg-sky-50",       icon: Coins },
  RETIRO_SOLICITADO:      { label: "Retiro solicitado",    clase: "text-indigo-600 bg-indigo-50", icon: Coins },
  DISPUTA_ABIERTA:        { label: "Disputa abierta",      clase: "text-amber-600 bg-amber-50",   icon: Gavel },
  DISPUTA_RESUELTA:       { label: "Disputa resuelta",     clase: "text-emerald-600 bg-emerald-50", icon: Gavel },
};
const ui = (tipo: string) => TIPO_UI[tipo] ?? { label: tipo, clase: "text-slate-600 bg-slate-100", icon: ShieldCheck };

const FILTROS = [
  { value: "TODOS",            label: "Todos" },
  { value: "LOGIN_FALLIDO",    label: "Login" },
  { value: "CODIGO_BLOQUEADO", label: "Código" },
  { value: "LIBERACION",       label: "Liberaciones" },
  { value: "DISPUTA_ABIERTA",  label: "Disputas" },
  { value: "RETIRO_SOLICITADO", label: "Retiros" },
];

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function resumenMeta(metadata: string | null): string {
  if (!metadata) return "";
  try {
    const m = JSON.parse(metadata) as Record<string, unknown>;
    return Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(" · ");
  } catch { return ""; }
}

export default function AdminSeguridadPage() {
  const [tipo, setTipo] = useState("TODOS");
  const { data, loading } = useQuery<{ eventosSeguridad: Evento[] }>(EVENTOS_SEGURIDAD, {
    variables: { tipo: tipo === "TODOS" ? null : tipo, limite: 150 },
    fetchPolicy: "cache-and-network",
  });
  const eventos = data?.eventosSeguridad ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <PageHero
        titulo="Auditoría de seguridad"
        subtitulo="Registro inmutable de acciones sensibles: accesos, liberaciones de fondos y disputas"
        icon={ShieldCheck}
        tono="slate"
      />

      <div className="mb-5">
        <FilterPills
          ariaLabel="Filtrar por tipo de evento" accent="slate" value={tipo}
          onChange={setTipo} options={FILTROS}
        />
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando eventos…</p>
        </div>
      ) : eventos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={ShieldCheck} titulo="Sin eventos" subtitulo="No hay eventos de seguridad con ese filtro." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-50">
            {eventos.map((e) => {
              const u = ui(e.tipo);
              const Icon = u.icon;
              return (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${u.clase}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{u.label}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {resumenMeta(e.metadata)}
                      {e.ordenId ? `${resumenMeta(e.metadata) ? " · " : ""}orden #${e.ordenId.slice(-6).toUpperCase()}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{fechaHora(e.creadoEn)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
