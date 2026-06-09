import type { PrismaClient } from "@prisma/client";

export const configSistemaRepository = {
  async findAll(prisma: PrismaClient) {
    return prisma.configuracionSistema.findMany({ orderBy: { clave: "asc" } });
  },

  async findByClave(clave: string, prisma: PrismaClient) {
    return prisma.configuracionSistema.findUnique({ where: { clave } });
  },

  async update(clave: string, valor: string, prisma: PrismaClient) {
    return prisma.configuracionSistema.update({ where: { clave }, data: { valor } });
  },
};
