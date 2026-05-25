import type { PrismaClient } from "@prisma/client";

function toSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const etiquetasRepository = {
  findAll(prisma: PrismaClient) {
    return prisma.etiqueta.findMany({ orderBy: { nombre: "asc" } });
  },

  findBySlug(slug: string, prisma: PrismaClient) {
    return prisma.etiqueta.findUnique({ where: { slug } });
  },

  findByNombre(nombre: string, prisma: PrismaClient) {
    return prisma.etiqueta.findUnique({ where: { nombre } });
  },

  async findOrCreate(nombre: string, prisma: PrismaClient) {
    const slug = toSlug(nombre);
    return prisma.etiqueta.upsert({
      where:  { slug },
      update: {},
      create: { nombre, slug },
    });
  },

  create(nombre: string, prisma: PrismaClient) {
    const slug = toSlug(nombre);
    return prisma.etiqueta.create({ data: { nombre, slug } });
  },
};
