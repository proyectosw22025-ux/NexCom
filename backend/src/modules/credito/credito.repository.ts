import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";

type Tipo = "REEMBOLSO" | "USO" | "RETIRO";

export const creditoRepository = {
  async sumarPorTipo(compradorId: string, tipo: Tipo, prisma: PrismaClient): Promise<Decimal> {
    const r = await prisma.movimientoCredito.aggregate({
      where: { compradorId, tipo }, _sum: { monto: true },
    });
    return new Decimal(r._sum.monto?.toString() ?? "0");
  },

  async existeMovimiento(ordenId: string, tipo: Tipo, prisma: PrismaClient): Promise<boolean> {
    const n = await prisma.movimientoCredito.count({ where: { ordenId, tipo } });
    return n > 0;
  },

  async crear(
    data: { compradorId: string; tipo: Tipo; monto: Decimal; ordenId?: string | null; descripcion?: string | null },
    prisma: PrismaClient,
  ) {
    return prisma.movimientoCredito.create({
      data: {
        compradorId: data.compradorId,
        tipo:        data.tipo,
        monto:       data.monto.toString(),
        ordenId:     data.ordenId ?? null,
        descripcion: data.descripcion ?? null,
      },
    });
  },

  async listar(compradorId: string, prisma: PrismaClient) {
    return prisma.movimientoCredito.findMany({
      where:   { compradorId },
      orderBy: { creadoEn: "desc" },
      take:    50,
    });
  },
};
