"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { EVENTOS_SEGURIDAD, RIESGO_VENDEDORES } from "@/graphql/admin/queries";
import { PageHero } from "@/components/ui/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { ShieldCheck, Loader2, ShieldAlert, LockKeyhole, Coins, Gavel, BadgeCheck, AlertTriangle } from "lucide-react";

interface Evento {
  id: string; tipo: string; usuarioId: string | null; ordenId: string | null;
  metadata: string | null; creadoEn: string;
}
interface RiesgoVendedor {
  vendedorId: string; nombre: string; verificado: boolean; ordenes: number;
  cancelados: number; disputas: number; score: number; nivel: string; factores: string[];
}

const NIVEL_UI: Record<string, string> = {
  ALTO:  "bg-rose-50 text-rose-700 border-rose-200",
  MEDIO: "bg-amber-50 text-amber-700 border-amber-200",
  BAJO:  "bg-emerald-50 text-emerald-700 border-emerald-200",
};

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
  const { data: riesgoData } = useQuery<{ riesgoVendedores: RiesgoVendedor[] }>(RIESGO_VENDEDORES, {
    fetchPolicy: "cache-and-network",
  });
  const eventos = data?.eventosSeguridad ?? [];
  const riesgo  = riesgoData?.riesgoVendedores ?? [];
  const enRiesgo = riesgo.filter((r) => r.nivel !== "BAJO");

  return (
    <div className="p-8 max-w-5xl">
      <PageHero
        titulo="Seguridad y riesgo"
        subtitulo="Scoring antifraude de vendedores y registro inmutable de acciones sensibles"
        icon={ShieldCheck}
        tono="slate"
      />

      {/* Scoring de riesgo (antifraude) */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Riesgo de vendedores
          {enRiesgo.length > 0 && <span className="text-amber-600">({enRiesgo.length} a revisar)</span>}
        </h2>
        {riesgo.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200">
            <EmptyState icon={BadgeCheck} titulo="Sin señales de riesgo" subtitulo="No hay vendedores con actividad suficiente para evaluar." />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-2.5 font-semibold">Vendedor</th>
                  <th className="px-5 py-2.5 font-semibold text-center">Nivel</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Órdenes</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Cancel.</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Disputas</th>
                  <th className="px-5 py-2.5 font-semibold">Señales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {riesgo.slice(0, 12).map((r) => (
                  <tr key={r.vendedorId} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900 flex items-center gap-1.5">
                        {r.verificado && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />}
                        {r.nombre}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${NIVEL_UI[r.nivel] ?? NIVEL_UI.BAJO}`}>
                        {r.nivel} · {r.score}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{r.ordenes}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{r.cancelados}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{r.disputas}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{r.factores.join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </section>

      <h2 className="text-sm font-bold text-slate-900 mb-3">Auditoría de eventos</h2>
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
