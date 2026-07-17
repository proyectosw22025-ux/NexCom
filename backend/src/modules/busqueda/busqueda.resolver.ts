import type { NexComContext } from "../../shared/types/context.type.js";
import { busquedaService } from "./busqueda.service.js";

export const busquedaResolvers = {
  Query: {
    buscar: (
      _: unknown,
      args: { termino: string; pagina?: number; limite?: number; categoriaId?: string; vendedorId?: string },
      ctx: NexComContext,
    ) => busquedaService.buscar(args, ctx.prisma),

    sugerenciasBusqueda: (
      _: unknown,
      { termino }: { termino: string },
      ctx: NexComContext,
    ) => busquedaService.sugerir(termino, ctx.prisma),
  },
};
