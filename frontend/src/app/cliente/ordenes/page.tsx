"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { MIS_ORDENES } from "@/graphql/ordenes/queries";
import { Badge } from "@/components/ui/Badge";
import { Package, Loader2, ChevronRight, ShoppingBag } from "lucide-react";

interface Orden {
  id: string;
  estado: string;
  subtotal: string;
  descuentoCupon: string;
  total: string;
  creadoEn: string;
  items: { id: string; nombreSnapshot: string; cantidad: number; precioUnitario: string }[];
  pago: { metodo: string; estado: string } | null;
}

const estadoBadge: Record<string, "pendiente" | "pagado" | "preparacion" | "enviado" | "entregado" | "completado" | "cancelado"> = {
  PENDIENTE_PAGO: "pendiente",
  PAGADO:         "pagado",
  EN_PREPARACION: "preparacion",
  ENVIADO:        "enviado",
  ENTREGADO:      "entregado",
  COMPLETADO:     "completado",
  CANCELADO:      "cancelado",
};

const estadoLabel: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADO:         "Pagado",
  EN_PREPARACION: "En preparación",
  ENVIADO:        "Enviado",
  ENTREGADO:      "Entregado",
  COMPLETADO:     "Completado",
  CANCELADO:      "Cancelado",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CompradorOrdenesPage() {
  const { data, loading } = useQuery<{ misOrdenes: Orden[] }>(MIS_ORDENES, {
    fetchPolicy: "cache-and-network",
  });

  const ordenes = data?.misOrdenes ?? [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mis Pedidos</h1>
        <p className="text-sm text-slate-400 mt-0.5">{ordenes.length} pedido{ordenes.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-xs text-slate-400">Cargando pedidos…</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 mb-1">Sin pedidos aún</p>
          <p className="text-sm text-slate-400 mb-6">Cuando realices una compra, aparecerá aquí</p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold
                       px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Explorar productos →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenes.map((o) => (
            <Link
              key={o.id}
              href={`/cliente/ordenes/${o.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-5
                         hover:shadow-md hover:shadow-slate-200/60 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Pedido #{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-sm font-semibold text-slate-900">{formatFecha(o.creadoEn)}</p>
                </div>
                <Badge
                  variant={estadoBadge[o.estado] ?? "pendiente"}
                  label={estadoLabel[o.estado] ?? o.estado}
                  dot
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="space-y-1">
                    {o.items.slice(0, 2).map((it) => (
                      <div key={it.id} className="flex items-center gap-2 text-xs text-slate-600">
                        <Package className="h-3 w-3 text-slate-300 shrink-0" />
                        <span className="truncate">{it.nombreSnapshot}</span>
                        <span className="shrink-0 text-slate-400">×{it.cantidad}</span>
                      </div>
                    ))}
                    {o.items.length > 2 && (
                      <p className="text-xs text-slate-400 pl-5">+{o.items.length - 2} producto{o.items.length - 2 !== 1 ? "s" : ""} más</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-slate-900">Bs. {o.total}</p>
                  {parseFloat(o.descuentoCupon) > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">-Bs. {o.descuentoCupon} cupón</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  {o.pago ? `Pago: ${o.pago.metodo}` : "Sin información de pago"}
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                  Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
