import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { fidelidadService } from "./fidelidad.service.js";

function compradorId(ctx: NexComContext) {
  requireRole(ctx, "COMPRADOR");
  if (!ctx.user?.perfilCompradorId) {
    throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilCompradorId;
}

export const fidelidadResolvers = {
  Query: {
    misPuntos: (_: unknown, __: unknown, ctx: NexComContext) =>
      fidelidadService.getPuntos(compradorId(ctx), ctx.prisma),

    misMovimientosPuntos: (_: unknown, __: unknown, ctx: NexComContext) =>
      fidelidadService.getMovimientos(compradorId(ctx), ctx.prisma),
  },
};
