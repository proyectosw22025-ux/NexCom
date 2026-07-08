"use client";

import { useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { ORDENES_VENDEDOR } from "@/graphql/ordenes/queries";
import { AVANZAR_ESTADO_ORDEN } from "@/graphql/ordenes/mutations";
import { Badge } from "@/components/ui/Badge";
import { Package, Loader2, ChevronRight, ShoppingBag, ArrowRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface CompradorResumen { id: string; nombreCompleto: string; telefono: string | null; }
interface OrdenVendedor {
  id: string; estado: string; subtotal: string; total: string;
  creadoEn: string; compradorId: string;
  items: { id: string; nombreSnapshot: string; cantidad: number }[];
  comprador: CompradorResumen | null;
  direccionSnapshot: { zona: string | null; ciudad: string } | null;
}

const estadoBadge: Record<string, "pendiente" | "pagado" | "preparacion" | "enviado" | "entregado" | "completado" | "cancelado"> = {
  PENDIENTE_PAGO: "pendiente", PAGADO: "pagado", EN_PREPARACION: "preparacion",
  ENVIADO: "enviado", ENTREGADO: "entregado", COMPLETADO: "completado", CANCELADO: "cancelado",
};
const estadoLabel: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente", PAGADO: "Pagado", EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado", ENTREGADO: "Entregado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
};
const PUEDE_AVANZAR = ["PAGADO", "EN_PREPARACION"];
const SIGUIENTE: Record<string, string> = {
  PAGADO: "Iniciar preparación",
  EN_PREPARACION: "Marcar como enviado",
};

// Días máximos para enviar antes de la cancelación automática (debe
// coincidir con DIAS_CANCELACION_SIN_ENVIO en el backend).
const DIAS_LIMITE_ENVIO = 7;

function diasRestantesEnvio(creadoEn: string) {
  const vencimiento = new Date(creadoEn).getTime() + DIAS_LIMITE_ENVIO * 86_400_000;
  return Math.ceil((vencimiento - Date.now()) / 86_400_000);
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function VendedorOrdenesPage() {
  const { data, loading, refetch } = useQuery<{ ordenesVendedor: OrdenVendedor[] }>(
    ORDENES_VENDEDOR, { fetchPolicy: "cache-and-network" },
  );
  const [avanzar, { loading: avanzando }] = useMutation(AVANZAR_ESTADO_ORDEN);

  const ordenes = data?.ordenesVendedor ?? [];

  // Agrupación de envíos por barrio: pedidos por enviar (PAGADO / EN_PREPARACION)
  // agrupados por ciudad + zona, para organizar las entregas por barrio.
  const porEnviar = ordenes.filter((o) => PUEDE_AVANZAR.includes(o.estado));
  const zonas = Object.values(
    porEnviar.reduce<Record<string, { ciudad: string; zona: string; total: number }>>((acc, o) => {
      const ciudad = o.direccionSnapshot?.ciudad ?? "Sin ciudad";
      const zona   = o.direccionSnapshot?.zona?.trim() || "Sin zona";
      const key    = `${ciudad}|${zona}`;
      acc[key] ??= { ciudad, zona, total: 0 };
      acc[key].total += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  async function handleAvanzar(id: string) {
    try {
      await avanzar({ variables: { id } });
      toast.success(`Orden actualizada.`);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mis Órdenes</h1>
        <p className="text-sm text-slate-400 mt-0.5">{ordenes.length} orden{ordenes.length !== 1 ? "es" : ""}</p>
      </div>

      {/* Agrupación de envíos por barrio (pedidos por enviar) */}
      {zonas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Envíos por zona</h2>
            <span className="text-xs text-slate-400">· {porEnviar.length} por enviar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {zonas.map((z) => (
              <div key={`${z.ciudad}-${z.zona}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">{z.zona}</span>
                <span className="text-xs text-slate-400">{z.ciudad}</span>
                <span className="min-w-[20px] h-5 px-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {z.total}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Organiza tus entregas agrupando los pedidos del mismo barrio.</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-xs text-slate-400">Cargando órdenes…</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 mb-1">Sin órdenes aún</p>
          <p className="text-sm text-slate-400">Cuando alguien compre tus productos, aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenes.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:shadow-slate-200/60 transition-all">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Orden #{o.id.slice(-8).toUpperCase()}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {o.comprador?.nombreCompleto ?? "Comprador"}
                    </p>
                    {o.comprador?.telefono && (
                      <span className="text-xs text-slate-400">{o.comprador.telefono}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{formatFecha(o.creadoEn)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge
                    variant={estadoBadge[o.estado] ?? "pendiente"}
                    label={estadoLabel[o.estado] ?? o.estado}
                    dot size="sm"
                  />
                  {PUEDE_AVANZAR.includes(o.estado) && (() => {
                    const dias = diasRestantesEnvio(o.creadoEn);
                    return (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        dias <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {dias <= 0 ? "Vence hoy" : `Vence en ${dias} día${dias !== 1 ? "s" : ""}`}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {o.items.slice(0, 2).map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <Package className="h-3 w-3 text-slate-300 shrink-0" />
                    <span className="truncate">{it.nombreSnapshot}</span>
                    <span className="shrink-0 text-slate-400">×{it.cantidad}</span>
                  </div>
                ))}
                {o.items.length > 2 && <p className="text-xs text-slate-400 pl-5">+{o.items.length - 2} más</p>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <p className="text-base font-bold text-slate-900">Bs. {o.total}</p>
                <div className="flex items-center gap-2">
                  {PUEDE_AVANZAR.includes(o.estado) && (
                    <button
                      onClick={() => handleAvanzar(o.id)}
                      disabled={avanzando}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700
                                 disabled:opacity-50 text-white text-xs font-semibold rounded-xl
                                 transition-colors shadow-sm shadow-indigo-200"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      {SIGUIENTE[o.estado]}
                    </button>
                  )}
                  <Link
                    href={`/vendedor/ordenes/${o.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600
                               hover:text-indigo-700 px-3 py-1.5 border border-slate-200
                               rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
