import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { saldosService } from "./saldos.service.js";

function vendedorId(ctx: NexComContext) {
  requireRole(ctx, "VENDEDOR");
  if (!ctx.user?.perfilVendedorId) {
    throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilVendedorId;
}

export const saldosResolvers = {
  Query: {
    miSaldo: (_: unknown, __: unknown, ctx: NexComContext) =>
      saldosService.getSaldo(vendedorId(ctx), ctx.prisma),

    misMovimientos: (_: unknown, __: unknown, ctx: NexComContext) =>
      saldosService.getMovimientos(vendedorId(ctx), ctx.prisma),

    misRetiros: (_: unknown, __: unknown, ctx: NexComContext) =>
      saldosService.getMisRetiros(vendedorId(ctx), ctx.prisma),

    retirosPendientes: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return saldosService.getRetirosPendientes(ctx.prisma);
    },

    retirosResueltos: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return saldosService.getRetirosResueltos(ctx.prisma);
    },
  },

  Mutation: {
    solicitarRetiro: (
      _: unknown,
      input: { monto: string; banco: string; numeroCuenta: string; titular: string },
      ctx: NexComContext,
    ) => saldosService.solicitarRetiro(vendedorId(ctx), input, ctx.prisma),

    resolverRetiro: (
      _: unknown,
      { id, aprobar, nota }: { id: string; aprobar: boolean; nota?: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return saldosService.resolverRetiro(id, aprobar, nota, ctx.prisma);
    },
  },
};
