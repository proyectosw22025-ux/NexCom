import { GraphQLError } from "graphql";
import { requireAuth, requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { preguntasService } from "./preguntas.service.js";

export const preguntasResolvers = {
  Query: {
    preguntasProducto: (_: unknown, { productoId }: { productoId: string }, ctx: NexComContext) =>
      preguntasService.getByProducto(productoId, ctx.prisma),
  },

  Mutation: {
    crearPregunta: (
      _: unknown,
      { productoId, pregunta }: { productoId: string; pregunta: string },
      ctx: NexComContext,
    ) => {
      const user = requireAuth(ctx);
      return preguntasService.crear(productoId, user.id, pregunta, ctx.prisma);
    },

    responderPregunta: (
      _: unknown,
      { preguntaId, respuesta }: { preguntaId: string; respuesta: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return preguntasService.responder(preguntaId, ctx.user.perfilVendedorId, respuesta, ctx.prisma);
    },
  },
};
