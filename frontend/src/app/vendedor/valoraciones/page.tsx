"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { VALORACIONES_RECIBIDAS } from "@/graphql/valoraciones/queries";
import { RESPONDER_VALORACION } from "@/graphql/valoraciones/mutations";
import { Star, MessageSquare, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface RespuestaValoracion { id: string; respuesta: string; creadoEn: string; }
interface Valoracion {
  id: string; ordenId: string; calificacion: number; comentario: string | null;
  creadoEn: string; respuesta: RespuestaValoracion | null;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function StarRow({ calificacion }: { calificacion: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= calificacion ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
      ))}
    </div>
  );
}

export default function VendedorValoracionesPage() {
  const { data, loading, refetch } = useQuery<{ valoracionesRecibidas: Valoracion[] }>(
    VALORACIONES_RECIBIDAS, { fetchPolicy: "cache-and-network" },
  );
  const [responder, { loading: respondiendo }] = useMutation(RESPONDER_VALORACION);

  const [replyId, setReplyId]         = useState<string | null>(null);
  const [respuesta, setRespuesta]     = useState("");

  const valoraciones = data?.valoracionesRecibidas ?? [];
  const promedio = valoraciones.length > 0
    ? (valoraciones.reduce((acc, v) => acc + v.calificacion, 0) / valoraciones.length).toFixed(1)
    : "—";

  async function handleResponder(valoracionId: string) {
    if (!respuesta.trim()) { toast.error("La respuesta no puede estar vacía."); return; }
    try {
      await responder({ variables: { valoracionId, respuesta: respuesta.trim() } });
      toast.success("Respuesta enviada.");
      setReplyId(null);
      setRespuesta("");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Valoraciones</h1>
          <p className="text-sm text-slate-400 mt-0.5">{valoraciones.length} reseña{valoraciones.length !== 1 ? "s" : ""}</p>
        </div>
        {valoraciones.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex items-center gap-3">
            <p className="text-2xl font-bold text-slate-900">{promedio}</p>
            <div>
              <StarRow calificacion={parseFloat(promedio) || 0} />
              <p className="text-xs text-slate-400 mt-0.5">Promedio</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-xs text-slate-400">Cargando valoraciones…</p>
        </div>
      ) : valoraciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <Star className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 mb-1">Sin valoraciones aún</p>
          <p className="text-sm text-slate-400">Las valoraciones de tus compradores aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          {valoraciones.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <StarRow calificacion={v.calificacion} />
                  <span className="text-sm font-bold text-slate-900">{v.calificacion}/5</span>
                </div>
                <span className="text-xs text-slate-400">{formatFecha(v.creadoEn)}</span>
              </div>

              {v.comentario && (
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">{v.comentario}</p>
              )}

              {/* Respuesta existente */}
              {v.respuesta ? (
                <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Tu respuesta</p>
                  <p className="text-sm text-slate-700">{v.respuesta.respuesta}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatFecha(v.respuesta.creadoEn)}</p>
                </div>
              ) : (
                <div className="mt-3">
                  {replyId === v.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                        placeholder="Escribe tu respuesta al comprador…"
                        rows={3}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResponder(v.id)}
                          disabled={respondiendo}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                                     text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors
                                     shadow-sm shadow-indigo-200"
                        >
                          {respondiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Enviar
                        </button>
                        <button
                          onClick={() => { setReplyId(null); setRespuesta(""); }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setReplyId(v.id); setRespuesta(""); }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600
                                 hover:text-indigo-700 px-3 py-1.5 border border-indigo-200
                                 rounded-xl hover:bg-indigo-50 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
