"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { MessageCircle, Send, Loader2, ChevronLeft, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { MIS_CONVERSACIONES, MENSAJES_CONVERSACION } from "@/graphql/mensajes/queries";
import { ENVIAR_MENSAJE } from "@/graphql/mensajes/mutations";
import { formatRelativeTime } from "@/lib/format-relative-time";

interface Conversacion { id: string; otroNombre: string; ultimoMensaje: string | null; actualizadoEn: string; noLeidos: number }
interface Mensaje { id: string; contenido: string; esMio: boolean; leido: boolean; creadoEn: string }

function MensajesContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const sel = useSearchParams().get("c");
  const [texto, setTexto] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  const { data: convData, loading: loadingConv } = useQuery<{ misConversaciones: Conversacion[] }>(
    MIS_CONVERSACIONES, { fetchPolicy: "cache-and-network", pollInterval: 15000, skip: !user },
  );
  const { data: msgData, loading: loadingMsg } = useQuery<{ mensajesConversacion: Mensaje[] }>(
    MENSAJES_CONVERSACION, { variables: { conversacionId: sel }, skip: !sel, fetchPolicy: "cache-and-network", pollInterval: 5000 },
  );
  const [enviarMensaje, { loading: enviando }] = useMutation(ENVIAR_MENSAJE);

  const conversaciones = convData?.misConversaciones ?? [];
  const mensajes = msgData?.mensajesConversacion ?? [];
  const convActiva = conversaciones.find((c) => c.id === sel);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes.length]);

  async function enviar() {
    if (!sel || !texto.trim()) return;
    const contenido = texto.trim();
    setTexto("");
    try {
      await enviarMensaje({
        variables: { conversacionId: sel, contenido },
        refetchQueries: [{ query: MENSAJES_CONVERSACION, variables: { conversacionId: sel } }, { query: MIS_CONVERSACIONES }],
      });
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
      setTexto(contenido);
    }
  }

  if (!isLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <MessageCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <p className="font-semibold text-slate-700">Inicia sesión para ver tus mensajes</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-indigo-600" /> Mensajes
      </h1>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[70vh]">
        {/* Bandeja */}
        <aside className={`md:col-span-1 border-r border-slate-100 overflow-y-auto ${sel ? "hidden md:block" : "block"}`}>
          {loadingConv && !convData ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : conversaciones.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageCircle className="h-9 w-9 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Sin conversaciones aún</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {conversaciones.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => router.push(`/mensajes?c=${c.id}`)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${sel === c.id ? "bg-indigo-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.otroNombre}</p>
                      {c.noLeidos > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {c.noLeidos > 9 ? "9+" : c.noLeidos}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{c.ultimoMensaje ?? "Conversación iniciada"}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Chat */}
        <section className={`md:col-span-2 flex flex-col ${sel ? "flex" : "hidden md:flex"}`}>
          {!sel ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle className="h-10 w-10 text-slate-200 mb-2" />
              <p className="text-sm text-slate-500">Selecciona una conversación</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <button onClick={() => router.push("/mensajes")} className="md:hidden p-1 rounded-lg hover:bg-slate-100">
                  <ChevronLeft className="h-4 w-4 text-slate-500" />
                </button>
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  <Store className="h-4 w-4 text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{convActiva?.otroNombre ?? "Conversación"}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                {loadingMsg && !msgData ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : mensajes.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">Escribe el primer mensaje 👋</p>
                ) : mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.esMio ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      m.esMio ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                    }`}>
                      <p>{m.contenido}</p>
                      <p className={`text-[10px] mt-0.5 ${m.esMio ? "text-indigo-200" : "text-slate-400"}`}>{formatRelativeTime(m.creadoEn)}</p>
                    </div>
                  </div>
                ))}
                <div ref={finRef} />
              </div>

              <div className="p-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
                  placeholder="Escribe un mensaje…"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
                <button
                  onClick={enviar}
                  disabled={enviando || !texto.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}>
      <MensajesContent />
    </Suspense>
  );
}
