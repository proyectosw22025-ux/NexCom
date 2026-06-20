import type { PrismaClient } from "@prisma/client";

type Tipo = "GANADOS" | "CANJEADOS";

export const fidelidadRepository = {
  async existeMovimiento(ordenId: string, tipo: Tipo, prisma: PrismaClient) {
    const m = await prisma.movimientoPuntos.findFirst({ where: { ordenId, tipo }, select: { id: true } });
    return !!m;
  },

  async crear(
    data: { compradorId: string; tipo: Tipo; puntos: number; ordenId?: string; descripcion?: string },
    prisma: PrismaClient,
  ) {
    return prisma.movimientoPuntos.create({ data });
  },

  async sumar(compradorId: string, tipo: Tipo, prisma: PrismaClient) {
    const r = await prisma.movimientoPuntos.aggregate({ where: { compradorId, tipo }, _sum: { puntos: true } });
    return r._sum.puntos ?? 0;
  },

  async listar(compradorId: string, prisma: PrismaClient) {
    return prisma.movimientoPuntos.findMany({
      where: { compradorId }, orderBy: { creadoEn: "desc" }, take: 50,
    });
  },
};
