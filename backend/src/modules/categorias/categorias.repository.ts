import type { PrismaClient } from "@prisma/client";

const include = {
  padre: true,
  hijos: { where: { activo: true }, orderBy: { orden: "asc" as const } },
};

export const categoriasRepository = {
  findAll(soloRaices: boolean, prisma: PrismaClient) {
    return prisma.categoria.findMany({
      where:   soloRaices ? { padreId: null, activo: true } : { activo: true },
      include,
      orderBy: { orden: "asc" },
    });
  },

  findBySlug(slug: string, prisma: PrismaClient) {
    return prisma.categoria.findUnique({ where: { slug }, include });
  },

  findById(id: string, prisma: PrismaClient) {
    return prisma.categoria.findUnique({ where: { id }, include });
  },

  create(data: { nombre: string; slug: string; icono?: string | null; padreId?: string | null; orden?: number }, prisma: PrismaClient) {
    return prisma.categoria.create({ data, include });
  },

  update(id: string, data: { nombre?: string; slug?: string; icono?: string | null; padreId?: string | null; orden?: number }, prisma: PrismaClient) {
    return prisma.categoria.update({ where: { id }, data, include });
  },
};
