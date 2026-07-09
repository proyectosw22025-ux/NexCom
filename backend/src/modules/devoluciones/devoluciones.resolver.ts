import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { devolucionesService } from "./devoluciones.service.js";

function compradorId(ctx: NexComContext) {
  requireRole(ctx, "COMPRADOR");
  if (!ctx.user?.perfilCompradorId) {
    throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilCompradorId;
}

function vendedorId(ctx: NexComContext) {
  requireRole(ctx, "VENDEDOR");
  if (!ctx.user?.perfilVendedorId) {
    throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilVendedorId;
}

export const devolucionesResolvers = {
  Query: {
    misDevoluciones: (_: unknown, __: unknown, ctx: NexComContext) =>
      devolucionesService.getMisDevoluciones(compradorId(ctx), ctx.prisma),

    devolucionesVendedor: (_: unknown, __: unknown, ctx: NexComContext) =>
      devolucionesService.getDevolucionesVendedor(vendedorId(ctx), ctx.prisma),

    devolucionDeOrden: (_: unknown, { ordenId }: { ordenId: string }, ctx: NexComContext) =>
      devolucionesService.getDevolucionDeOrden(ordenId, compradorId(ctx), ctx.prisma),
  },

  Mutation: {
    solicitarDevolucion: (
      _: unknown,
      { ordenId, motivo, tipoProblema, evidenciaUrls }:
        { ordenId: string; motivo: string; tipoProblema?: string | null; evidenciaUrls?: string[] | null },
      ctx: NexComContext,
    ) => devolucionesService.solicitar(compradorId(ctx), ctx.user!.id, ordenId, motivo, tipoProblema, evidenciaUrls, ctx.prisma),

    responderDevolucion: (
      _: unknown,
      { id, aprobar, respuesta }: { id: string; aprobar: boolean; respuesta?: string },
      ctx: NexComContext,
    ) => devolucionesService.responder(vendedorId(ctx), ctx.user!.id, id, aprobar, respuesta, ctx.prisma),
  },
};
