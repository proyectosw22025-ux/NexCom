"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { MI_ORDEN } from "@/graphql/ordenes/queries";
import { MARCAR_ORDEN_ENTREGADA } from "@/graphql/ordenes/mutations";
import { CREAR_VALORACION } from "@/graphql/valoraciones/mutations";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft, Loader2, Package, MapPin, CreditCard,
  CheckCircle, Star, Send, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface DireccionSnapshot {
  alias: string; destinatario: string; calle: string; zona?: string;
  ciudad: string; departamento: string; referencia?: string;
}
interface ItemOrden { id: string; nombreSnapshot: string; cantidad: number; precioUnitario: string; subtotal: string; }
interface HistorialEstado { id: string; estadoAnterior: string | null; estadoNuevo: string; notas: string | null; creadoEn: string; }
interface Orden {
  id: string; estado: string; subtotal: string; descuentoCupon: string; total: string;
  notas: string | null; creadoEn: string; actualizadoEn: string;
  direccionSnapshot: DireccionSnapshot | null;
  items: ItemOrden[];
  pago: { monto: string; moneda: string; metodo: string; estado: string } | null;
  historialEstados: HistorialEstado[];
}

const estadoBadge: Record<string, "pendiente" | "pagado" | "preparacion" | "enviado" | "entregado" | "completado" | "cancelado"> = {
  PENDIENTE_PAGO: "pendiente", PAGADO: "pagado", EN_PREPARACION: "preparacion",
  ENVIADO: "enviado", ENTREGADO: "entregado", COMPLETADO: "completado", CANCELADO: "cancelado",
};
const estadoLabel: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago", PAGADO: "Pagado", EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado", ENTREGADO: "Entregado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CompradorOrdenDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data, loading, refetch } = useQuery<{ miOrden: Orden }>(MI_ORDEN, {
    variables: { id }, fetchPolicy: "cache-and-network",
  });

  const [marcarEntregada, { loading: marcando }] = useMutation(MARCAR_ORDEN_ENTREGADA);
  const [crearValoracion, { loading: valorando }] = useMutation(CREAR_VALORACION);

  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario]     = useState("");
  const [showVal, setShowVal]           = useState(false);

  const orden = data?.miOrden;

  async function handleEntregada() {
    if (!confirm("¿Confirmas que recibiste tu pedido?")) return;
    try {
      await marcarEntregada({ variables: { id } });
      toast.success("¡Pedido confirmado como entregado!");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  async function handleValorar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await crearValoracion({ variables: { input: { ordenId: id, calificacion, comentario: comentario || null } } });
      toast.success("¡Valoración enviada!");
      setShowVal(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      <p className="text-xs text-slate-400">Cargando pedido…</p>
    </div>
  );

  if (!orden) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Pedido no encontrado.</p>
      <Link href="/comprador/ordenes" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">← Volver</Link>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/comprador/ordenes" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Pedido #{orden.id.slice(-8).toUpperCase()}</h1>
            <Badge variant={estadoBadge[orden.estado] ?? "pendiente"} label={estadoLabel[orden.estado] ?? orden.estado} dot />
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{formatFecha(orden.creadoEn)}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Productos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" /> Productos
          </h2>
          <div className="space-y-3">
            {orden.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{it.nombreSnapshot}</p>
                  <p className="text-xs text-slate-400">×{it.cantidad} · Bs. {it.precioUnitario} c/u</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">Bs. {it.subtotal}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>Bs. {orden.subtotal}</span>
            </div>
            {parseFloat(orden.descuentoCupon) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Descuento cupón</span><span>-Bs. {orden.descuentoCupon}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
              <span>Total</span><span>Bs. {orden.total}</span>
            </div>
          </div>
        </div>

        {/* Dirección */}
        {orden.direccionSnapshot && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" /> Dirección de entrega
            </h2>
            <div className="text-sm text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-900">{orden.direccionSnapshot.destinatario}</p>
              <p>{orden.direccionSnapshot.calle}{orden.direccionSnapshot.zona ? `, ${orden.direccionSnapshot.zona}` : ""}</p>
              <p>{orden.direccionSnapshot.ciudad}, {orden.direccionSnapshot.departamento}</p>
              {orden.direccionSnapshot.referencia && <p className="text-slate-400">{orden.direccionSnapshot.referencia}</p>}
            </div>
          </div>
        )}

        {/* Pago */}
        {orden.pago && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-600" /> Pago
            </h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{orden.pago.metodo === "card" ? "Tarjeta de crédito/débito" : orden.pago.metodo}</span>
              <span className="font-semibold text-slate-900">Bs. {orden.pago.monto}</span>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" /> Historial de estados
          </h2>
          <div className="space-y-3">
            {orden.historialEstados.map((h) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {estadoLabel[h.estadoNuevo] ?? h.estadoNuevo}
                  </p>
                  {h.notas && <p className="text-xs text-slate-400">{h.notas}</p>}
                  <p className="text-xs text-slate-400">{formatFecha(h.creadoEn)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        {orden.estado === "ENVIADO" && (
          <button
            onClick={handleEntregada}
            disabled={marcando}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                       disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm
                       transition-colors shadow-sm shadow-emerald-200"
          >
            {marcando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Confirmar que recibí mi pedido
          </button>
        )}

        {/* Valoración */}
        {orden.estado === "ENTREGADO" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            {!showVal ? (
              <button
                onClick={() => setShowVal(true)}
                className="w-full flex items-center justify-center gap-2 border border-indigo-200
                           text-indigo-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-indigo-50 transition-colors"
              >
                <Star className="h-4 w-4" /> Valorar este pedido
              </button>
            ) : (
              <form onSubmit={handleValorar} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">¿Cómo fue tu experiencia?</h3>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n} type="button"
                      onClick={() => setCalificacion(n)}
                      className="focus:outline-none"
                    >
                      <Star className={`h-7 w-7 transition-colors ${n <= calificacion ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Cuéntanos sobre tu experiencia (opcional)…"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="submit" disabled={valorando}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                               text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors
                               shadow-sm shadow-indigo-200"
                  >
                    {valorando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar valoración
                  </button>
                  <button type="button" onClick={() => setShowVal(false)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
