import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { ordenesService } from "./ordenes.service.js";

export const ordenesResolvers = {
  Query: {
    misOrdenes: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ordenesService.getMisOrdenes(ctx.user.perfilCompradorId, ctx.prisma);
    },

    miOrden: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ordenesService.getMiOrden(id, ctx.user.perfilCompradorId, ctx.prisma);
    },

    ordenesVendedor: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR", "ADMIN");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ordenesService.getOrdenesVendedor(ctx.user.perfilVendedorId, ctx.prisma);
    },

    ordenVendedor: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR", "ADMIN");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ordenesService.getOrdenVendedor(id, ctx.user.perfilVendedorId, ctx.prisma);
    },
  },

  Mutation: {
    avanzarEstadoOrden: (
      _: unknown,
      { id, notas }: { id: string; notas?: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ordenesService.avanzarEstado(id, ctx.user.perfilVendedorId, ctx.user.id, notas, ctx.prisma);
    },

    marcarOrdenEntregada: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ordenesService.marcarEntregada(id, ctx.user.perfilCompradorId, ctx.user.id, ctx.prisma);
    },
  },
};
