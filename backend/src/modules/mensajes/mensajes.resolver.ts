import { GraphQLError } from "graphql";
import { requireAuth, requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { mensajesService } from "./mensajes.service.js";

export const mensajesResolvers = {
  Query: {
    misConversaciones: (_: unknown, __: unknown, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return mensajesService.getConversaciones(user, ctx.prisma);
    },

    mensajesConversacion: (_: unknown, { conversacionId }: { conversacionId: string }, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return mensajesService.getMensajes(conversacionId, user.id, ctx.prisma);
    },
  },

  Mutation: {
    iniciarConversacion: (
      _: unknown,
      { vendedorId, productoId }: { vendedorId: string; productoId?: string | null },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "CLIENTE");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return mensajesService.iniciar(ctx.user.perfilCompradorId, vendedorId, productoId ?? null, ctx.prisma);
    },

    enviarMensaje: (
      _: unknown,
      { conversacionId, contenido }: { conversacionId: string; contenido: string },
      ctx: NexComContext,
    ) => {
      const user = requireAuth(ctx);
      return mensajesService.enviar(conversacionId, user.id, contenido, ctx.prisma);
    },
  },
};
