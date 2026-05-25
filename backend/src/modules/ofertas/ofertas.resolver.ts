import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { ofertasService } from "./ofertas.service.js";

type CrearOfertaInput = {
  titulo: string;
  descripcion?: string | null;
  descuento: number;
  fechaInicio: string;
  fechaFin: string;
  productoIds: string[];
};

type ActualizarOfertaInput = {
  titulo?: string;
  descripcion?: string | null;
  descuento?: number;
  fechaFin?: string;
  productoIds?: string[];
};

export const ofertasResolvers = {
  Query: {
    ofertasActivas: (_: unknown, __: unknown, ctx: NexComContext) =>
      ofertasService.getActivas(ctx.prisma),

    misOfertas: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR", "ADMIN");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ofertasService.getMisOfertas(ctx.user.perfilVendedorId, ctx.prisma);
    },
  },

  Mutation: {
    crearOferta: (_: unknown, { input }: { input: CrearOfertaInput }, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ofertasService.crear(ctx.user.perfilVendedorId, input, ctx.prisma);
    },

    actualizarOferta: (
      _: unknown,
      { id, input }: { id: string; input: ActualizarOfertaInput },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ofertasService.actualizar(id, ctx.user.perfilVendedorId, input, ctx.prisma);
    },

    cancelarOferta: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return ofertasService.cancelar(id, ctx.user.perfilVendedorId, ctx.prisma);
    },
  },
};
