import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { etiquetasService } from "./etiquetas.service.js";

export const etiquetasResolvers = {
  Query: {
    etiquetas: (_: unknown, __: unknown, ctx: NexComContext) =>
      etiquetasService.getAll(ctx.prisma),
  },

  Mutation: {
    crearEtiqueta: (_: unknown, { nombre }: { nombre: string }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return etiquetasService.create(nombre, ctx.prisma);
    },
  },
};
