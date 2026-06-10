import { requireAuth } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { notificacionesService } from "./notificaciones.service.js";
import { pubsub, type NotificacionPayload } from "../../shared/pubsub.js";

export const notificacionesResolvers = {
  Query: {
    misNotificaciones: (_: unknown, __: unknown, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return notificacionesService.getMisNotificaciones(user.id, ctx.prisma);
    },

    notificacionesNoLeidas: (_: unknown, __: unknown, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return notificacionesService.getNoLeidas(user.id, ctx.prisma);
    },
  },

  Mutation: {
    marcarNotificacionLeida: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return notificacionesService.marcarLeida(id, user.id, ctx.prisma);
    },

    marcarTodasLeidas: (_: unknown, __: unknown, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return notificacionesService.marcarTodasLeidas(user.id, ctx.prisma);
    },
  },

  Subscription: {
    notificacionCreada: {
      subscribe: (_: unknown, __: unknown, ctx: NexComContext) => {
        const user = requireAuth(ctx);
        return pubsub.subscribe(`notificacion:${user.id}`);
      },
      resolve: (payload: NotificacionPayload) => payload,
    },
  },
};
