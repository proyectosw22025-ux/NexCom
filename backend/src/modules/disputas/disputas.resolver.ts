import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { disputasService } from "./disputas.service.js";

function compradorId(ctx: NexComContext) {
  const id = ctx.user?.perfilCompradorId;
  if (!id) throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  return id;
}

export const disputasResolvers = {
  Query: {
    misDisputas: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      return disputasService.getMisDisputas(compradorId(ctx), ctx.prisma);
    },
    disputaDeOrden: (_: unknown, { ordenId }: { ordenId: string }, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      compradorId(ctx);
      return disputasService.getDisputaDeOrden(ordenId, ctx.prisma);
    },
    disputasPendientes: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return disputasService.getPendientes(ctx.prisma);
    },
    disputasResueltas: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return disputasService.getResueltas(ctx.prisma);
    },
  },

  Mutation: {
    abrirDisputa: (
      _: unknown,
      input: { ordenId: string; motivo: string; descripcion?: string; evidenciaUrl?: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "COMPRADOR");
      return disputasService.abrir(compradorId(ctx), ctx.user!.id, input, ctx.prisma);
    },

    resolverDisputa: (
      _: unknown,
      input: { disputaId: string; aFavor: string; nota?: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return disputasService.resolver(ctx.user!.id, input, ctx.prisma);
    },
  },
};
