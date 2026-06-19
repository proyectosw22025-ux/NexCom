"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import Link from "next/link";
import { MessageCircleQuestion, Loader2, Send, Store, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { PREGUNTAS_PRODUCTO } from "@/graphql/preguntas/queries";
import { CREAR_PREGUNTA, RESPONDER_PREGUNTA } from "@/graphql/preguntas/mutations";
import { useAuth } from "@/context/auth-context";

interface Pregunta {
  id: string; pregunta: string; respuesta: string | null;
  respondidoEn: string | null; creadoEn: string; autor: string;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

/** Respuesta del vendedor inline (solo visible para el dueño en preguntas sin responder). */
function ResponderForm({ preguntaId, onDone }: { preguntaId: string; onDone: () => void }) {
  const [texto, setTexto] = useState("");
  const [responder, { loading }] = useMutation(RESPONDER_PREGUNTA);

  async function enviar() {
    if (!texto.trim()) return;
    try {
      await responder({ variables: { preguntaId, respuesta: texto.trim() } });
      toast.success("Respuesta publicada.");
      onDone();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="mt-2 ml-6 flex items-start gap-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Escribe tu respuesta…"
        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none
                   focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
      />
      <button
        onClick={enviar}
        disabled={loading || !texto.trim()}
        className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm
                   font-semibold rounded-xl transition-colors shrink-0"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Responder"}
      </button>
    </div>
  );
}

interface ProductoPreguntasProps {
  productoId: string;
  /** id del perfil vendedor dueño del producto (para habilitar responder) */
  vendedorId?: string;
}

export function ProductoPreguntas({ productoId, vendedorId }: ProductoPreguntasProps) {
  const { user } = useAuth();
  const esVendedorDueno = Boolean(user?.rol === "VENDEDOR" && vendedorId && user.perfilVendedor?.id === vendedorId);
  const { data, loading, refetch } = useQuery<{ preguntasProducto: Pregunta[] }>(PREGUNTAS_PRODUCTO, {
    variables: { productoId }, fetchPolicy: "cache-and-network",
  });
  const [crearPregunta, { loading: enviando }] = useMutation(CREAR_PREGUNTA);
  const [texto, setTexto] = useState("");

  const preguntas = data?.preguntasProducto ?? [];
  const puedePreguntar = user && user.rol === "COMPRADOR";

  async function preguntar() {
    if (texto.trim().length < 5) { toast.error("Escribe una pregunta más detallada."); return; }
    try {
      await crearPregunta({ variables: { productoId, pregunta: texto.trim() } });
      toast.success("Pregunta enviada. El vendedor te responderá pronto.");
      setTexto("");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <section className="mt-12 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircleQuestion className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">Preguntas y respuestas</h2>
      </div>

      {/* Formulario de pregunta (comprador) */}
      {puedePreguntar ? (
        <div className="flex items-start gap-2 mb-6">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") preguntar(); }}
            placeholder="¿Tienes una duda sobre este producto?"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <button
            onClick={preguntar}
            disabled={enviando}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                       text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200 shrink-0"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Preguntar
          </button>
        </div>
      ) : !user ? (
        <p className="text-sm text-slate-500 mb-6">
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Inicia sesión</Link> para hacer una pregunta.
        </p>
      ) : null}

      {/* Lista */}
      {loading && !data ? (
        <div className="flex items-center gap-2 py-6 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Cargando preguntas…</span>
        </div>
      ) : preguntas.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircleQuestion className="h-9 w-9 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Todavía no hay preguntas. ¡Haz la primera!</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {preguntas.map((q) => (
            <li key={q.id} className="border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{q.pregunta}</p>
                <span className="text-xs text-slate-400 shrink-0">{formatFecha(q.creadoEn)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">por {q.autor}</p>

              {q.respuesta ? (
                <div className="mt-3 ml-3 pl-3 border-l-2 border-violet-100">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Store className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-slate-700">Respuesta del vendedor</span>
                  </div>
                  <p className="text-sm text-slate-600">{q.respuesta}</p>
                </div>
              ) : esVendedorDueno ? (
                <ResponderForm preguntaId={q.id} onDone={refetch} />
              ) : (
                <p className="mt-2 ml-3 text-xs text-slate-400 flex items-center gap-1">
                  <CornerDownRight className="h-3 w-3" /> Sin responder aún
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
