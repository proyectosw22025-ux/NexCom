import { GraphQLError } from "graphql";
import { requireAuth, requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { cuponesService } from "./cupones.service.js";

type CrearCuponInput = {
  codigo: string;
  tipo: string;
  valor: number;
  montoMinimo?: number | null;
  maxUsos?: number | null;
  fechaInicio: string;
  fechaFin: string;
};

export const cuponesResolvers = {
  Query: {
    cupones: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return cuponesService.getAll(ctx.prisma);
    },

    misCupones: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return cuponesService.getCuponesVendedor(ctx.user.perfilVendedorId, ctx.prisma);
    },
  },

  Mutation: {
    crearCupon: (_: unknown, { input }: { input: CrearCuponInput }, ctx: NexComContext) => {
      const user = requireRole(ctx, "VENDEDOR", "ADMIN");
      // Vendedor → cupón con scope a su tienda. Admin → cupón global (vendedorId null).
      const vendedorId = user.rol === "VENDEDOR" ? ctx.user?.perfilVendedorId ?? null : null;
      if (user.rol === "VENDEDOR" && !vendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return cuponesService.crear(input, ctx.prisma, vendedorId);
    },

    desactivarCupon: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      const user = requireRole(ctx, "VENDEDOR", "ADMIN");
      return cuponesService.desactivar(id, user.rol, ctx.user?.perfilVendedorId ?? null, ctx.prisma);
    },

    validarCupon: (
      _: unknown,
      { codigo, subtotal }: { codigo: string; subtotal: string },
      ctx: NexComContext,
    ) => {
      const user = requireAuth(ctx);
      return cuponesService.validar(codigo, subtotal, user.id, ctx.prisma);
    },
  },
};
