"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { MIS_ORDENES } from "@/graphql/ordenes/queries";
import { NOTIFICACIONES_NO_LEIDAS, MIS_NOTIFICACIONES } from "@/graphql/notificaciones/queries";
import { Package, Bell, ShoppingBag, ChevronRight, Loader2, CheckCircle, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Orden {
  id: string;
  estado: string;
  total: string;
  creadoEn: string;
  items: { id: string; nombreSnapshot: string; cantidad: number }[];
}

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  url: string | null;
  creadoEn: string;
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

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CompradorPage() {
  const { user } = useAuth();
  const { data: ordenesData, loading: loadingOrdenes } = useQuery<{ misOrdenes: Orden[] }>(
    MIS_ORDENES, { fetchPolicy: "cache-and-network" },
  );
  const { data: notifData, loading: loadingNotif } = useQuery<{ misNotificaciones: Notificacion[] }>(
    MIS_NOTIFICACIONES, { fetchPolicy: "cache-and-network" },
  );
  const { data: noLeidasData } = useQuery<{ notificacionesNoLeidas: number }>(
    NOTIFICACIONES_NO_LEIDAS, { fetchPolicy: "cache-and-network" },
  );

  const ordenes = ordenesData?.misOrdenes ?? [];
  const notifs  = (notifData?.misNotificaciones ?? []).slice(0, 5);
  const noLeidas = noLeidasData?.notificacionesNoLeidas ?? 0;

  const stats = [
    { label: "Total pedidos",  value: ordenes.length, icon: Package,      color: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "En camino",      value: ordenes.filter(o => o.estado === "ENVIADO").length, icon: Truck, color: "bg-sky-50", iconColor: "text-sky-600" },
    { label: "Completados",    value: ordenes.filter(o => o.estado === "COMPLETADO").length, icon: CheckCircle, color: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Notif. nuevas",  value: noLeidas, icon: Bell, color: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Hola, {user?.perfilComprador?.nombreCompleto?.split(" ")[0] ?? "Comprador"}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Resumen de tu actividad en NexCom</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos pedidos */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Últimos pedidos</h2>
            <Link href="/comprador/ordenes" className="text-xs text-indigo-600 hover:underline font-semibold">
              Ver todos →
            </Link>
          </div>
          {loadingOrdenes ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              <p className="text-xs text-slate-400">Cargando pedidos…</p>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin pedidos aún</p>
              <Link href="/productos" className="text-xs text-indigo-600 font-semibold hover:underline mt-1 block">
                Explorar productos →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {ordenes.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/comprador/ordenes/${o.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {o.items[0]?.nombreSnapshot ?? "Pedido"}
                        {o.items.length > 1 && ` +${o.items.length - 1}`}
                      </p>
                      <p className="text-xs text-slate-400">{formatFecha(o.creadoEn)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={estadoBadge[o.estado] ?? "pendiente"} size="sm" dot
                        label={o.estado.replace("_", " ")} />
                      <span className="text-sm font-semibold text-slate-700">Bs. {o.total}</span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notificaciones recientes */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Notificaciones</h2>
              {noLeidas > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {noLeidas}
                </span>
              )}
            </div>
          </div>
          {loadingNotif ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              <p className="text-xs text-slate-400">Cargando notificaciones…</p>
            </div>
          ) : notifs.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin notificaciones</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {notifs.map((n) => (
                <li key={n.id} className={`px-5 py-3.5 ${!n.leido ? "bg-indigo-50/40" : ""}`}>
                  <div className="flex items-start gap-3">
                    {!n.leido && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{n.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatFecha(n.creadoEn)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
