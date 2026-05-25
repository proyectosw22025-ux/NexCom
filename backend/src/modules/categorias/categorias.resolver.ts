import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { categoriasService } from "./categorias.service.js";

type CategoriaInput = {
  nombre: string; slug: string; icono?: string | null; padreId?: string | null; orden?: number;
};

export const categoriasResolvers = {
  Query: {
    categorias: (_: unknown, { soloRaices = false }: { soloRaices?: boolean }, ctx: NexComContext) =>
      categoriasService.getAll(soloRaices, ctx.prisma),

    categoria: (_: unknown, { slug }: { slug: string }, ctx: NexComContext) =>
      categoriasService.getBySlug(slug, ctx.prisma),
  },

  Mutation: {
    crearCategoria: (_: unknown, { input }: { input: CategoriaInput }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return categoriasService.create(input, ctx.prisma);
    },

    actualizarCategoria: (_: unknown, { id, input }: { id: string; input: CategoriaInput }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return categoriasService.update(id, input, ctx.prisma);
    },
  },
};
