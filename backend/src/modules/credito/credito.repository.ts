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

  // ── Retiros de la billetera (a banco) ──────────────────────────────────────
  async sumarRetiros(compradorId: string, estados: ("PENDIENTE" | "PAGADO" | "RECHAZADO")[], prisma: PrismaClient): Promise<Decimal> {
    const r = await prisma.retiroCredito.aggregate({
      where: { compradorId, estado: { in: estados } }, _sum: { monto: true },
    });
    return new Decimal(r._sum.monto?.toString() ?? "0");
  },

  async crearRetiro(
    data: { compradorId: string; monto: Decimal; banco: string; numeroCuenta: string; titular: string },
    prisma: PrismaClient,
  ) {
    return prisma.retiroCredito.create({
      data: {
        compradorId: data.compradorId, monto: data.monto.toString(),
        banco: data.banco, numeroCuenta: data.numeroCuenta, titular: data.titular,
      },
    });
  },

  async listRetirosByComprador(compradorId: string, prisma: PrismaClient) {
    return prisma.retiroCredito.findMany({ where: { compradorId }, orderBy: { creadoEn: "desc" }, take: 30 });
  },

  async listRetirosPendientes(prisma: PrismaClient) {
    return prisma.retiroCredito.findMany({
      where: { estado: "PENDIENTE" }, orderBy: { creadoEn: "asc" },
      include: { comprador: { select: { nombreCompleto: true, usuario: { select: { email: true } } } } },
    });
  },

  async findRetiro(id: string, prisma: PrismaClient) {
    return prisma.retiroCredito.findUnique({
      where: { id },
      include: { comprador: { select: { id: true, usuarioId: true } } },
    });
  },

  async actualizarRetiro(id: string, estado: "PAGADO" | "RECHAZADO", notaAdmin: string | null, prisma: PrismaClient) {
    return prisma.retiroCredito.update({
      where: { id }, data: { estado, notaAdmin, resueltoEn: new Date() },
    });
  },
};
