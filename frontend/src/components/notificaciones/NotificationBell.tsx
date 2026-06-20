"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useLazyQuery, useSubscription } from "@apollo/client";
import * as Popover from "@radix-ui/react-popover";
import { toast } from "sonner";
import {
  Bell, CheckCheck, CreditCard, ShoppingBag, Loader2, TrendingDown, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { MIS_NOTIFICACIONES, NOTIFICACIONES_NO_LEIDAS } from "@/graphql/notificaciones/queries";
import { MARCAR_NOTIFICACION_LEIDA, MARCAR_TODAS_LEIDAS } from "@/graphql/notificaciones/mutations";
import { NOTIFICACION_CREADA } from "@/graphql/notificaciones/subscriptions";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  url: string | null;
  ordenId: string | null;
  creadoEn: string;
}

const TIPO_ICONOS: Record<string, typeof Bell> = {
  PAGO_CONFIRMADO: CreditCard,
  NUEVA_ORDEN:     ShoppingBag,
  BAJADA_PRECIO:   TrendingDown,
  NUEVO_MENSAJE:   MessageCircle,
};

const ACCENTS = {
  indigo: { dot: "bg-indigo-600", text: "text-indigo-600", hover: "hover:bg-indigo-50", iconBg: "bg-indigo-50" },
  violet: { dot: "bg-violet-600", text: "text-violet-600", hover: "hover:bg-violet-50", iconBg: "bg-violet-50" },
  slate:  { dot: "bg-slate-600",  text: "text-slate-600",  hover: "hover:bg-slate-100", iconBg: "bg-slate-100" },
} as const;

interface NotificationBellProps {
  accent?: keyof typeof ACCENTS;
}

export function NotificationBell({ accent = "indigo" }: NotificationBellProps) {
  const router = useRouter();
  const colors = ACCENTS[accent];

  const { data: noLeidasData, refetch: refetchNoLeidas } = useQuery<{ notificacionesNoLeidas: number }>(
    NOTIFICACIONES_NO_LEIDAS,
    { fetchPolicy: "cache-and-network" },
  );

  const [cargarNotificaciones, { data: listaData, loading: loadingLista }] = useLazyQuery<{ misNotificaciones: Notificacion[] }>(
    MIS_NOTIFICACIONES,
    { fetchPolicy: "network-only" },
  );

  const [marcarLeida] = useMutation(MARCAR_NOTIFICACION_LEIDA);
  const [marcarTodasLeidas, { loading: marcandoTodas }] = useMutation(MARCAR_TODAS_LEIDAS);

  const { data: subData } = useSubscription<{ notificacionCreada: Notificacion }>(NOTIFICACION_CREADA);

  useEffect(() => {
    const notif = subData?.notificacionCreada;
    if (!notif) return;
    toast(notif.titulo, { description: notif.mensaje });
    refetchNoLeidas();
  }, [subData, refetchNoLeidas]);

  const noLeidas = noLeidasData?.notificacionesNoLeidas ?? 0;
  const notificaciones = (listaData?.misNotificaciones ?? []).slice(0, 8);

  async function handleClickNotificacion(notif: Notificacion) {
    if (!notif.leido) {
      await marcarLeida({ variables: { id: notif.id } });
      refetchNoLeidas();
    }
    if (notif.url) router.push(notif.url);
  }

  async function handleMarcarTodas() {
    await marcarTodasLeidas();
    refetchNoLeidas();
    cargarNotificaciones();
  }

  return (
    <Popover.Root onOpenChange={(open) => { if (open) cargarNotificaciones(); }}>
      <Popover.Trigger asChild>
        <button
          aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ""}`}
          className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Bell className="h-5 w-5 text-slate-700" />
          {noLeidas > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full",
              "flex items-center justify-center", colors.dot,
            )}>
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-80 max-h-[28rem] overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarTodas}
                disabled={marcandoTodas}
                className={cn("flex items-center gap-1 text-xs font-medium", colors.text, "hover:underline disabled:opacity-50")}
              >
                {marcandoTodas ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Marcar todas
              </button>
            )}
          </div>

          {loadingLista ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : notificaciones.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin notificaciones</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {notificaciones.map((notif) => {
                const Icono = TIPO_ICONOS[notif.tipo] ?? Bell;
                return (
                  <li key={notif.id}>
                    <button
                      onClick={() => handleClickNotificacion(notif)}
                      className={cn("w-full flex items-start gap-3 px-4 py-3 text-left transition-colors", colors.hover)}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colors.iconBg)}>
                        <Icono className={cn("h-4 w-4", colors.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{notif.titulo}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{notif.mensaje}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatRelativeTime(notif.creadoEn)}</p>
                      </div>
                      {!notif.leido && <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", colors.dot)} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
