import type { NexComContext } from "../../shared/types/context.type.js";
import { busquedaService } from "./busqueda.service.js";

export const busquedaResolvers = {
  Query: {
    buscar: (
      _: unknown,
      args: { termino: string; pagina?: number; limite?: number; categoriaId?: string },
      ctx: NexComContext,
    ) => busquedaService.buscar(args, ctx.prisma),
  },
};
