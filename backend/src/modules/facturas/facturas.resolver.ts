import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { facturasService } from "./facturas.service.js";

function compradorId(ctx: NexComContext) {
  requireRole(ctx, "CLIENTE");
  if (!ctx.user?.perfilCompradorId) {
    throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilCompradorId;
}

export const facturasResolvers = {
  Query: {
    facturaDeOrden: (_: unknown, { ordenId }: { ordenId: string }, ctx: NexComContext) =>
      facturasService.getByOrden(ordenId, compradorId(ctx), ctx.prisma),
  },

  Mutation: {
    solicitarFactura: (
      _: unknown,
      { ordenId, nitComprador, razonSocial }: { ordenId: string; nitComprador: string; razonSocial: string },
      ctx: NexComContext,
    ) => facturasService.solicitar(compradorId(ctx), ordenId, nitComprador, razonSocial, ctx.prisma),
  },
};
