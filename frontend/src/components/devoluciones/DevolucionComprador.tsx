"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { RotateCcw, Loader2, CheckCircle2, XCircle, Clock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DEVOLUCION_DE_ORDEN, SOLICITAR_DEVOLUCION } from "@/graphql/devoluciones";
import { Select } from "@/components/ui/Select";
import { ImageUploader } from "@/components/productos/ImageUploader";

interface Devolucion {
  id: string; estado: string; motivo: string; montoReembolso: string; respuestaVendedor: string | null;
  tipoProblema?: string | null; evidenciaUrls?: string[];
}

const TIPO_PROBLEMA = [
  { value: "DEFECTUOSO", label: "Llegó dañado / defectuoso" },
  { value: "NO_CORRESPONDE", label: "No es lo que pedí" },
  { value: "INCOMPLETO", label: "Llegó incompleto" },
  { value: "OTRO", label: "Otro motivo" },
];

const ESTADO_UI: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  SOLICITADA:  { icon: Clock,        color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     label: "Devolución en revisión" },
  REEMBOLSADA: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Devolución aprobada y reembolsada" },
  RECHAZADA:   { icon: XCircle,      color: "text-red-700",     bg: "bg-red-50 border-red-200",         label: "Devolución rechazada" },
};

/** Sección de devolución para el comprador: solicita o muestra el estado. */
export function DevolucionComprador({ ordenId }: { ordenId: string }) {
  const { data, loading } = useQuery<{ devolucionDeOrden: Devolucion | null }>(DEVOLUCION_DE_ORDEN, {
    variables: { ordenId }, fetchPolicy: "cache-and-network",
  });
  const [solicitar, { loading: enviando }] = useMutation(SOLICITAR_DEVOLUCION);
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tipo, setTipo] = useState("DEFECTUOSO");
  const [fotos, setFotos] = useState<string[]>([]);

  const devolucion = data?.devolucionDeOrden ?? null;

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await solicitar({
        variables: { ordenId, motivo, tipoProblema: tipo, evidenciaUrls: fotos },
        refetchQueries: [{ query: DEVOLUCION_DE_ORDEN, variables: { ordenId } }],
      });
      toast.success("Solicitud de devolución enviada al vendedor.");
      setAbierto(false);
      setMotivo(""); setFotos([]); setTipo("DEFECTUOSO");
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  if (loading && !data) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-6 h-20 animate-pulse" />;
  }

  // Ya existe una devolución → mostrar su estado
  if (devolucion) {
    const ui = ESTADO_UI[devolucion.estado] ?? ESTADO_UI.SOLICITADA;
    const Icono = ui.icon;
    return (
      <div className={`rounded-2xl border p-5 ${ui.bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <Icono className={`h-5 w-5 ${ui.color}`} />
          <h3 className={`text-sm font-bold ${ui.color}`}>{ui.label}</h3>
        </div>
        <p className="text-xs text-slate-600"><span className="font-semibold">Tu motivo:</span> {devolucion.motivo}</p>
        {devolucion.evidenciaUrls && devolucion.evidenciaUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {devolucion.evidenciaUrls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                <Image src={u} alt="Evidencia" fill className="object-cover" />
              </a>
            ))}
          </div>
        )}
        {devolucion.estado === "REEMBOLSADA" && (
          <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1.5 font-medium">
            <Wallet className="h-3.5 w-3.5" /> Se acreditaron <span className="font-bold">Bs. {devolucion.montoReembolso}</span> a tu billetera.
          </p>
        )}
        {devolucion.respuestaVendedor && (
          <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Respuesta del vendedor:</span> {devolucion.respuestaVendedor}</p>
        )}
      </div>
    );
  }

  // Sin devolución → permitir solicitar
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {!abierto ? (
        <button
          onClick={() => setAbierto(true)}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600
                     font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Solicitar devolución
        </button>
      ) : (
        <form onSubmit={handleSolicitar} className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Solicitar devolución</h3>
          <p className="text-xs text-slate-500">Cuéntale al vendedor qué pasó y adjunta evidencia. Si se aprueba, el dinero vuelve a tu billetera.</p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">¿Qué problema tuviste?</label>
            <Select value={tipo} onValueChange={setTipo} options={TIPO_PROBLEMA} />
          </div>

          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describe el problema: el producto llegó dañado, no era lo que esperaba…"
            rows={3}
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fotos de evidencia (recomendado)</label>
            <ImageUploader value={fotos} onChange={setFotos} max={5} />
          </div>
          <div className="flex gap-3">
            <button
              type="submit" disabled={enviando}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                         text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Enviar solicitud
            </button>
            <button type="button" onClick={() => setAbierto(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
