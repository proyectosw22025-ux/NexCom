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
  },

  Mutation: {
    crearCupon: (_: unknown, { input }: { input: CrearCuponInput }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return cuponesService.crear(input, ctx.prisma);
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
