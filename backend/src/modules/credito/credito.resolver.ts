import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { creditoService } from "./credito.service.js";

export const creditoResolvers = {
  Query: {
    miBilletera: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return creditoService.getBilletera(ctx.user.perfilCompradorId, ctx.prisma);
    },
  },
};
