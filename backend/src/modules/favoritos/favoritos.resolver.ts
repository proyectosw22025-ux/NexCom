import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { favoritosService } from "./favoritos.service.js";

function getCompradorId(ctx: NexComContext): string {
  requireRole(ctx, "COMPRADOR");
  if (!ctx.user?.perfilCompradorId) {
    throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilCompradorId;
}

export const favoritosResolvers = {
  Query: {
    misFavoritos: (_: unknown, __: unknown, ctx: NexComContext) =>
      favoritosService.getAll(getCompradorId(ctx), ctx.prisma),

    esFavorito: (_: unknown, { productoId }: { productoId: string }, ctx: NexComContext) =>
      favoritosService.check(getCompradorId(ctx), productoId, ctx.prisma),
  },

  Mutation: {
    toggleFavorito: (_: unknown, { productoId }: { productoId: string }, ctx: NexComContext) =>
      favoritosService.toggle(getCompradorId(ctx), productoId, ctx.prisma),
  },

  Favorito: {
    creadoEn: (f: { creadoEn: Date }) => f.creadoEn.toISOString(),
  },
};
