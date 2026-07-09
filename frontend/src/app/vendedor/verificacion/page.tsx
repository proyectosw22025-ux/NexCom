"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { ShieldCheck, Loader2, Clock, XCircle, CheckCircle2, Crown, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ME } from "@/graphql/auth/queries";
import { ENVIAR_VERIFICACION } from "@/graphql/verificacion";
import { Select } from "@/components/ui/Select";
import { ImageUploader } from "@/components/productos/ImageUploader";
import { nivelConfianza, esVerificado, NIVELES } from "@/lib/nivel-confianza";

interface PerfilVendedor {
  estadoVerificacion?: string | null;
  verificacionNotas?: string | null;
  documentoUrl?: string | null;
  documentoTipo?: string | null;
  verificado?: boolean;
  totalVentas?: number;
  ratingPromedio?: string | null;
}
interface MeData { me: { perfilVendedor: PerfilVendedor | null } | null }

const TIPO_DOC = [
  { value: "CI", label: "Carnet de identidad (CI)" },
  { value: "NIT", label: "NIT (empresa)" },
  { value: "PASAPORTE", label: "Pasaporte" },
];

export default function VerificacionPage() {
  const { data, loading, refetch } = useQuery<MeData>(ME, { fetchPolicy: "cache-and-network" });
  const [enviar, { loading: enviando }] = useMutation(ENVIAR_VERIFICACION);
  const [tipo, setTipo] = useState("CI");
  const [docs, setDocs] = useState<string[]>([]);

  const perfil = data?.me?.perfilVendedor;
  const estado = perfil?.estadoVerificacion ?? "NO_ENVIADO";
  const nivel = perfil ? nivelConfianza(perfil) : "NUEVO";

  async function handleEnviar() {
    if (docs.length === 0) { toast.error("Adjunta una foto de tu documento."); return; }
    try {
      await enviar({ variables: { documentoUrl: docs[0], documentoTipo: tipo } });
      toast.success("¡Documento enviado! Lo revisaremos pronto.");
      setDocs([]);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  const puedeEnviar = estado === "NO_ENVIADO" || estado === "RECHAZADO";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-sky-600" /> Verificación de tu tienda
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Verificar tu identidad genera confianza en los compradores y desbloquea beneficios.
        </p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Estado actual */}
          {estado === "PENDIENTE" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">En revisión</p>
                <p className="text-sm text-slate-500">Recibimos tu documento ({perfil?.documentoTipo}). Te avisaremos cuando esté resuelto.</p>
              </div>
            </div>
          )}
          {esVerificado(perfil ?? {}) && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">¡Tienda verificada!</p>
                <p className="text-sm text-slate-500">Ya luces el sello de confianza y puedes retirar tus fondos.</p>
              </div>
            </div>
          )}
          {estado === "RECHAZADO" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Verificación rechazada</p>
                <p className="text-sm text-slate-500">{perfil?.verificacionNotas || "El documento no cumple los requisitos."} Puedes volver a enviarla abajo.</p>
              </div>
            </div>
          )}

          {/* Escalera de confianza (incentivos) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-bold text-slate-900">Tu nivel de confianza</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["NUEVO", "VERIFICADO", "DESTACADO"] as const).map((n) => {
                const meta = NIVELES[n];
                const actual = nivel === n;
                return (
                  <div key={n} className={`rounded-xl border p-4 ${actual ? meta.bg : "border-slate-200 bg-slate-50/50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${actual ? meta.color : "text-slate-500"}`}>{meta.emoji} {meta.label}</span>
                      {actual && <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">Tú</span>}
                    </div>
                    <ul className="space-y-1.5">
                      {meta.beneficios.map((b) => (
                        <li key={b} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulario de envío */}
          {puedeEnviar && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Envía tu documento</h2>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Tipo de documento</label>
                <Select value={tipo} onValueChange={setTipo} options={TIPO_DOC} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Foto del documento</label>
                <ImageUploader value={docs} onChange={setDocs} max={1} />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Tu documento es privado: solo lo ve nuestro equipo de verificación. No se muestra a los compradores.
                </p>
              </div>
              <button
                onClick={handleEnviar}
                disabled={enviando || docs.length === 0}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-sky-200"
              >
                {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <>Enviar para revisión <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
