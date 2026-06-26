"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { ORDEN_VENDEDOR } from "@/graphql/ordenes/queries";
import { AVANZAR_ESTADO_ORDEN, CONFIRMAR_ENTREGA_CON_CODIGO } from "@/graphql/ordenes/mutations";
import { Badge } from "@/components/ui/Badge";
import { TimelineEstados } from "@/components/ordenes/TimelineEstados";
import { CambiarEstadoModal, transicionDisponible } from "@/components/ordenes/CambiarEstadoModal";
import { ArrowLeft, Loader2, Package, MapPin, CreditCard, Clock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface DireccionSnapshot {
  alias: string; destinatario: string; calle: string; zona?: string;
  ciudad: string; departamento: string; referencia?: string;
}
interface ItemOrden { id: string; nombreSnapshot: string; cantidad: number; precioUnitario: string; subtotal: string; }
interface HistorialEstado { id: string; estadoAnterior: string | null; estadoNuevo: string; notas: string | null; creadoEn: string; }
interface CompradorResumen { id: string; nombreCompleto: string; telefono: string | null; }
interface OrdenVendedor {
  id: string; estado: string; subtotal: string; total: string; notas: string | null;
  creadoEn: string; actualizadoEn: string; compradorId: string;
  autoLiberaEn: string | null; fondosLiberadosEn: string | null;
  direccionSnapshot: DireccionSnapshot | null;
  items: ItemOrden[];
  pago: { monto: string; moneda: string; metodo: string; estado: string } | null;
  historialEstados: HistorialEstado[];
  comprador: CompradorResumen | null;
}

const estadoBadge: Record<string, "pendiente" | "pagado" | "preparacion" | "enviado" | "entregado" | "completado" | "cancelado"> = {
  PENDIENTE_PAGO: "pendiente", PAGADO: "pagado", EN_PREPARACION: "preparacion",
  ENVIADO: "enviado", ENTREGADO: "entregado", COMPLETADO: "completado", CANCELADO: "cancelado",
};
const estadoLabel: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago", PAGADO: "Pagado", EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado", ENTREGADO: "Entregado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
};
const SIGUIENTE: Record<string, string> = {
  PAGADO: "Iniciar preparación",
  EN_PREPARACION: "Marcar como enviado",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VendedorOrdenDetallePage() {
  const { id } = useParams<{ id: string }>();

  const { data, loading, refetch } = useQuery<{ ordenVendedor: OrdenVendedor }>(ORDEN_VENDEDOR, {
    variables: { id }, fetchPolicy: "cache-and-network",
  });
  const [avanzar, { loading: avanzando }] = useMutation(AVANZAR_ESTADO_ORDEN);
  const [confirmarCodigo, { loading: confirmando }] = useMutation(CONFIRMAR_ENTREGA_CON_CODIGO);
  const [codigo, setCodigo] = useState("");

  async function handleConfirmarCodigo() {
    try {
      await confirmarCodigo({ variables: { id, codigo } });
      toast.success("Entrega confirmada. Tu pago fue liberado de la garantía.");
      setCodigo("");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  async function handleAvanzar(input: { notas?: string; comprobanteUrl?: string }) {
    try {
      await avanzar({ variables: { id, notas: input.notas ?? null, comprobanteUrl: input.comprobanteUrl ?? null } });
      toast.success("Estado de orden actualizado. El comprador fue notificado.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
      throw err; // mantiene el modal abierto si falla
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      <p className="text-xs text-slate-400">Cargando orden…</p>
    </div>
  );

  const orden = data?.ordenVendedor;
  if (!orden) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Orden no encontrada.</p>
      <Link href="/vendedor/ordenes" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">← Volver</Link>
    </div>
  );

  const puedeAvanzar = transicionDisponible(orden.estado);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vendedor/ordenes" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Orden #{orden.id.slice(-8).toUpperCase()}</h1>
            <Badge variant={estadoBadge[orden.estado] ?? "pendiente"} label={estadoLabel[orden.estado] ?? orden.estado} dot />
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{formatFecha(orden.creadoEn)}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Comprador */}
        {orden.comprador && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" /> Comprador
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{orden.comprador.nombreCompleto}</p>
                {orden.comprador.telefono && <p className="text-xs text-slate-400">{orden.comprador.telefono}</p>}
              </div>
            </div>
          </div>
        )}

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
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-base font-bold text-slate-900">
            <span>Total</span><span>Bs. {orden.total}</span>
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
              <span className="text-slate-500">{orden.pago.metodo === "card" ? "Tarjeta" : orden.pago.metodo}</span>
              <span className="font-semibold text-slate-900">Bs. {orden.pago.monto}</span>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" /> Seguimiento de la orden
          </h2>
          <TimelineEstados historial={orden.historialEstados} estadoActual={orden.estado} />
        </div>

        {/* Confirmar entrega con código (handshake) — el pago está retenido en garantía */}
        {orden.estado === "ENVIADO" && !orden.fondosLiberadosEn && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1.5 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Confirmar entrega
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Al entregar el producto, pide al comprador su <strong>código de entrega</strong> (lo ve en su pedido)
              e ingrésalo aquí para confirmar la entrega y liberar tu pago retenido.
            </p>
            <div className="flex gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold
                           tracking-[0.4em] tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
              <button
                onClick={handleConfirmarCodigo}
                disabled={confirmando || codigo.length < 6}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                           text-white font-semibold px-5 rounded-xl text-sm transition-colors shadow-sm shadow-emerald-200"
              >
                {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Confirmar
              </button>
            </div>
            {orden.autoLiberaEn && (
              <p className="text-[11px] text-slate-400 mt-3">
                Si el comprador no confirma, el pago se libera automáticamente el{" "}
                {new Date(orden.autoLiberaEn).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}.
              </p>
            )}
          </div>
        )}

        {/* Acción */}
        {puedeAvanzar && (
          <CambiarEstadoModal
            estadoActual={orden.estado}
            onConfirm={handleAvanzar}
            trigger={
              <button
                disabled={avanzando}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                           disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm
                           transition-colors shadow-sm shadow-indigo-200"
              >
                {avanzando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {SIGUIENTE[orden.estado]}
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
