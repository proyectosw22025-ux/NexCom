import type { PrismaClient } from "@prisma/client";

type Tipo = "VENTA" | "RETENCION" | "LIBERACION" | "REEMBOLSO";

export const saldosRepository = {
  async existeMovimiento(ordenId: string, tipo: Tipo, prisma: PrismaClient) {
    const m = await prisma.movimientoSaldo.findFirst({ where: { ordenId, tipo }, select: { id: true } });
    return !!m;
  },

  async crearMovimiento(
    data: { vendedorId: string; tipo: Tipo; monto: string; comision: string; ordenId?: string; descripcion?: string },
    prisma: PrismaClient,
  ) {
    return prisma.movimientoSaldo.create({ data });
  },

  /** Monto neto de un movimiento por orden y tipo (p. ej. RETENCION) — para liberar/reembolsar exacto. */
  async findMovimientoPorOrden(ordenId: string, tipo: Tipo, prisma: PrismaClient) {
    return prisma.movimientoSaldo.findFirst({ where: { ordenId, tipo }, select: { monto: true, comision: true } });
  },

  /** Compat: monto neto acreditado por una orden (RETENCION nuevo, o VENTA legacy). */
  async findVentaPorOrden(ordenId: string, prisma: PrismaClient) {
    return prisma.movimientoSaldo.findFirst({
      where: { ordenId, tipo: { in: ["RETENCION", "VENTA"] } }, select: { monto: true },
    });
  },

  async sumarMovimientos(vendedorId: string, tipo: Tipo, prisma: PrismaClient) {
    const r = await prisma.movimientoSaldo.aggregate({
      where:  { vendedorId, tipo },
      _sum:   { monto: true, comision: true },
    });
    return { monto: r._sum.monto?.toString() ?? "0", comision: r._sum.comision?.toString() ?? "0" };
  },

  async sumarRetiros(vendedorId: string, estado: "PENDIENTE" | "PAGADO", prisma: PrismaClient) {
    const r = await prisma.solicitudRetiro.aggregate({ where: { vendedorId, estado }, _sum: { monto: true } });
    return r._sum.monto?.toString() ?? "0";
  },

  async listMovimientos(vendedorId: string, prisma: PrismaClient) {
    return prisma.movimientoSaldo.findMany({
      where: { vendedorId }, orderBy: { creadoEn: "desc" }, take: 50,
    });
  },

  async crearRetiro(
    data: { vendedorId: string; monto: string; banco: string; numeroCuenta: string; titular: string },
    prisma: PrismaClient,
  ) {
    return prisma.solicitudRetiro.create({ data });
  },

  async listRetirosByVendedor(vendedorId: string, prisma: PrismaClient) {
    return prisma.solicitudRetiro.findMany({ where: { vendedorId }, orderBy: { creadoEn: "desc" } });
  },

  async listRetirosPendientes(prisma: PrismaClient) {
    return prisma.solicitudRetiro.findMany({
      where:   { estado: "PENDIENTE" },
      orderBy: { creadoEn: "asc" },
      include: { vendedor: { select: { nombreNegocio: true, usuarioId: true } } },
    });
  },

  async listRetirosResueltos(prisma: PrismaClient) {
    return prisma.solicitudRetiro.findMany({
      where:   { estado: { not: "PENDIENTE" } },
      orderBy: { resueltoEn: "desc" },
      take:    30,
      include: { vendedor: { select: { nombreNegocio: true } } },
    });
  },

  async findRetiro(id: string, prisma: PrismaClient) {
    return prisma.solicitudRetiro.findUnique({
      where:  { id },
      include: { vendedor: { select: { id: true, usuarioId: true } } },
    });
  },

  async actualizarRetiro(id: string, estado: "PAGADO" | "RECHAZADO", nota: string | null, prisma: PrismaClient) {
    return prisma.solicitudRetiro.update({
      where: { id },
      data:  { estado, notaAdmin: nota, resueltoEn: new Date() },
    });
  },
};
