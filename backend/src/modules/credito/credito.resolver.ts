import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { creditoService } from "./credito.service.js";

function compradorId(ctx: NexComContext) {
  requireRole(ctx, "CLIENTE");
  if (!ctx.user?.perfilCompradorId) {
    throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilCompradorId;
}

export const creditoResolvers = {
  Query: {
    miBilletera: (_: unknown, __: unknown, ctx: NexComContext) =>
      creditoService.getBilletera(compradorId(ctx), ctx.prisma),

    misRetirosCredito: (_: unknown, __: unknown, ctx: NexComContext) =>
      creditoService.getMisRetiros(compradorId(ctx), ctx.prisma),

    retirosCreditoPendientes: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return creditoService.getRetirosPendientes(ctx.prisma);
    },
  },

  Mutation: {
    solicitarRetiroCredito: (
      _: unknown,
      { input }: { input: { monto: string; banco: string; numeroCuenta: string; titular: string } },
      ctx: NexComContext,
    ) => creditoService.solicitarRetiro(compradorId(ctx), input, ctx.prisma),

    resolverRetiroCredito: (
      _: unknown,
      { id, aprobar, nota }: { id: string; aprobar: boolean; nota?: string | null },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return creditoService.resolverRetiro(id, aprobar, nota ?? null, ctx.prisma);
    },
  },
};
