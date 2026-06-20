"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { RotateCcw, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { DEVOLUCION_DE_ORDEN, SOLICITAR_DEVOLUCION } from "@/graphql/devoluciones";

interface Devolucion {
  id: string; estado: string; motivo: string; montoReembolso: string; respuestaVendedor: string | null;
}

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

  const devolucion = data?.devolucionDeOrden ?? null;

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await solicitar({
        variables: { ordenId, motivo },
        refetchQueries: [{ query: DEVOLUCION_DE_ORDEN, variables: { ordenId } }],
      });
      toast.success("Solicitud de devolución enviada al vendedor.");
      setAbierto(false);
      setMotivo("");
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
        {devolucion.estado === "REEMBOLSADA" && (
          <p className="text-xs text-slate-600 mt-1">Monto reembolsado: <span className="font-semibold">Bs. {devolucion.montoReembolso}</span></p>
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
          <p className="text-xs text-slate-500">Cuéntale al vendedor por qué quieres devolver este pedido.</p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: el producto llegó dañado, no era lo que esperaba…"
            rows={3}
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
          />
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
