"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { ShieldAlert, Loader2, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { DISPUTA_DE_ORDEN, ABRIR_DISPUTA } from "@/graphql/disputas";

interface Disputa {
  id: string; estado: string; motivo: string; descripcion: string | null; resolucionNota: string | null; creadoEn: string;
}

const MOTIVOS = [
  { value: "NO_RECIBIDO",        label: "No recibí el producto" },
  { value: "PRODUCTO_INCORRECTO", label: "Llegó un producto incorrecto" },
  { value: "DANADO",             label: "Llegó dañado" },
  { value: "OTRO",               label: "Otro problema" },
];
const MOTIVO_LABEL: Record<string, string> = Object.fromEntries(MOTIVOS.map((m) => [m.value, m.label]));
const ESTADO_UI: Record<string, { label: string; clase: string }> = {
  ABIERTA:            { label: "En revisión por la plataforma", clase: "bg-amber-50 text-amber-700 border-amber-200" },
  RESUELTA_COMPRADOR: { label: "Resuelto a tu favor (reembolso)", clase: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RESUELTA_VENDEDOR:  { label: "Resuelto a favor del vendedor", clase: "bg-slate-100 text-slate-600 border-slate-200" },
};

/** Reclamo de Compra Protegida: visible mientras el pago sigue retenido. */
export function ReclamoComprador({ ordenId, puedeAbrir }: { ordenId: string; puedeAbrir: boolean }) {
  const { data, loading, refetch } = useQuery<{ disputaDeOrden: Disputa | null }>(DISPUTA_DE_ORDEN, {
    variables: { ordenId }, fetchPolicy: "cache-and-network",
  });
  const [abrir, { loading: enviando }] = useMutation(ABRIR_DISPUTA);
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("NO_RECIBIDO");
  const [descripcion, setDescripcion] = useState("");

  const disputa = data?.disputaDeOrden;

  async function handleAbrir(e: React.FormEvent) {
    e.preventDefault();
    try {
      await abrir({ variables: { ordenId, motivo, descripcion: descripcion || null } });
      toast.success("Reclamo enviado. La plataforma lo revisará.");
      setOpen(false); setDescripcion("");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  if (loading && !data) return null;
  if (!disputa && !puedeAbrir) return null;

  if (disputa) {
    const ui = ESTADO_UI[disputa.estado] ?? ESTADO_UI.ABIERTA;
    return (
      <div className={`rounded-2xl border p-5 ${ui.clase}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {disputa.estado === "RESUELTA_COMPRADOR"
            ? <CheckCircle className="h-4 w-4" />
            : <ShieldAlert className="h-4 w-4" />}
          <h3 className="text-sm font-bold">Reclamo — {ui.label}</h3>
        </div>
        <p className="text-xs opacity-90">Motivo: {MOTIVO_LABEL[disputa.motivo] ?? disputa.motivo}</p>
        {disputa.descripcion && <p className="text-xs opacity-80 mt-1">“{disputa.descripcion}”</p>}
        {disputa.resolucionNota && <p className="text-xs opacity-90 mt-2">Resolución: {disputa.resolucionNota}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-amber-200 text-amber-700
                     font-semibold py-2.5 rounded-xl text-sm hover:bg-amber-50 transition-colors"
        >
          <ShieldAlert className="h-4 w-4" /> ¿Problema con tu pedido? Abrir un reclamo
        </button>
      ) : (
        <form onSubmit={handleAbrir} className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Abrir reclamo</h3>
          <p className="text-xs text-slate-500">Tu pago está retenido. Si hay un problema, la plataforma media y puede reembolsarte.</p>
          <select
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
          >
            {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <textarea
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Cuéntanos qué pasó (opcional)…" rows={3}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
          />
          <div className="flex gap-2">
            <button
              type="submit" disabled={enviando}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar reclamo
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
