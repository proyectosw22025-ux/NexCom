import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { direccionesService } from "./direcciones.service.js";

type CrearDireccionInput = {
  alias: string;
  destinatario: string;
  calle: string;
  zona?: string | null;
  ciudad?: string;
  departamento?: string;
  referencia?: string | null;
  esPrincipal?: boolean;
};

type ActualizarDireccionInput = {
  alias?: string;
  destinatario?: string;
  calle?: string;
  zona?: string | null;
  ciudad?: string;
  departamento?: string;
  referencia?: string | null;
};

export const direccionesResolvers = {
  Query: {
    misDirecciones: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "CLIENTE");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return direccionesService.getMias(ctx.user.perfilCompradorId, ctx.prisma);
    },
  },

  Mutation: {
    crearDireccion: (_: unknown, { input }: { input: CrearDireccionInput }, ctx: NexComContext) => {
      requireRole(ctx, "CLIENTE");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return direccionesService.crear(ctx.user.perfilCompradorId, input, ctx.prisma);
    },

    actualizarDireccion: (
      _: unknown,
      { id, input }: { id: string; input: ActualizarDireccionInput },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "CLIENTE");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return direccionesService.actualizar(id, ctx.user.perfilCompradorId, input, ctx.prisma);
    },

    eliminarDireccion: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "CLIENTE");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return direccionesService.eliminar(id, ctx.user.perfilCompradorId, ctx.prisma);
    },

    setPrincipal: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "CLIENTE");
      if (!ctx.user?.perfilCompradorId) {
        throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return direccionesService.setPrincipal(id, ctx.user.perfilCompradorId, ctx.prisma);
    },
  },
};
