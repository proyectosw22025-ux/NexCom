import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { pagosService } from "./pagos.service.js";

export const pagosResolvers = {
  Mutation: {
    crearPaymentIntent: (
      _: unknown,
      { direccionId, cuponCodigo }: { direccionId: string; cuponCodigo?: string | null },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return pagosService.crearPaymentIntent(
        ctx.user.perfilCompradorId,
        ctx.user.id,
        direccionId,
        cuponCodigo,
        ctx.prisma,
        ctx.stripe,
      );
    },
  },
};
