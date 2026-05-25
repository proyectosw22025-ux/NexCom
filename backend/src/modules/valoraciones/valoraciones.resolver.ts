import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { valoracionesService } from "./valoraciones.service.js";

type CrearValoracionInput = {
  ordenId: string;
  calificacion: number;
  comentario?: string | null;
};

export const valoracionesResolvers = {
  Query: {
    misValoraciones: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return valoracionesService.getMisValoraciones(ctx.user.perfilCompradorId, ctx.prisma);
    },

    valoracionesDeVendedor: (_: unknown, { vendedorId }: { vendedorId: string }, ctx: NexComContext) => {
      return valoracionesService.getValoracionesDeVendedor(vendedorId, ctx.prisma);
    },

    valoracionesRecibidas: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR", "ADMIN");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return valoracionesService.getValoracionesRecibidas(ctx.user.perfilVendedorId, ctx.prisma);
    },
  },

  Mutation: {
    crearValoracion: (
      _: unknown,
      { input }: { input: CrearValoracionInput },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "COMPRADOR");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return valoracionesService.crear(ctx.user.perfilCompradorId, input, ctx.prisma);
    },

    responderValoracion: (
      _: unknown,
      { valoracionId, respuesta }: { valoracionId: string; respuesta: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return valoracionesService.responder(valoracionId, ctx.user.perfilVendedorId, respuesta, ctx.prisma);
    },
  },
};
