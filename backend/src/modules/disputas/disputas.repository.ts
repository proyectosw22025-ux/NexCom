import type { PrismaClient } from "@prisma/client";

const ordenSel = {
  items: { select: { productoId: true, cantidad: true } },
  comprador: { select: { id: true, usuarioId: true, nombreCompleto: true } },
  vendedor:  { select: { id: true, usuarioId: true, nombreNegocio: true } },
} as const;

export const disputasRepository = {
  /** Abre la disputa y congela la auto-liberación de la orden (transacción). */
  async crear(
    data: { ordenId: string; compradorId: string; vendedorId: string; motivo: string; descripcion: string | null; evidenciaUrl: string | null },
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      const disputa = await tx.disputa.create({ data });
      await tx.orden.update({ where: { id: data.ordenId }, data: { disputaAbierta: true } });
      return disputa;
    });
  },

  findDeOrden(ordenId: string, prisma: PrismaClient) {
    return prisma.disputa.findUnique({ where: { ordenId } });
  },

  findConOrden(id: string, prisma: PrismaClient) {
    return prisma.disputa.findUnique({ where: { id }, include: { orden: { include: ordenSel } } });
  },

  findByComprador(compradorId: string, prisma: PrismaClient) {
    return prisma.disputa.findMany({
      where: { compradorId }, orderBy: { creadoEn: "desc" },
      include: { orden: { select: { total: true } } },
    });
  },

  listPorEstado(abiertas: boolean, prisma: PrismaClient) {
    return prisma.disputa.findMany({
      where:   abiertas ? { estado: "ABIERTA" } : { estado: { not: "ABIERTA" } },
      orderBy: abiertas ? { creadoEn: "asc" } : { resueltoEn: "desc" },
      take:    abiertas ? undefined : 40,
      include: { orden: { include: ordenSel } },
    });
  },

  /** Resuelve a favor del COMPRADOR: orden CANCELADA, restock, disputa cerrada. */
  async resolverReembolso(
    id: string, ordenId: string, adminId: string, nota: string | null,
    items: Array<{ productoId: string; cantidad: number }>, prisma: PrismaClient,
  ) {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { id: ordenId }, select: { estado: true } });
    return prisma.$transaction(async (tx) => {
      const d = await tx.disputa.update({
        where: { id },
        data:  { estado: "RESUELTA_COMPRADOR", resolucionNota: nota, resueltoPorId: adminId, resueltoEn: new Date() },
      });
      await tx.orden.update({ where: { id: ordenId }, data: { estado: "CANCELADO", disputaAbierta: false } });
      await tx.historialEstadoOrden.create({
        data: { ordenId, estadoAnterior: orden.estado as never, estadoNuevo: "CANCELADO", cambiadoPorId: adminId, notas: "Disputa resuelta a favor del comprador" },
      });
      for (const it of items) {
        await tx.producto.update({ where: { id: it.productoId }, data: { stock: { increment: it.cantidad } } });
      }
      return d;
    });
  },

  /** Resuelve a favor del VENDEDOR: orden ENTREGADA + fondos liberables, disputa cerrada. */
  async resolverLiberacion(id: string, ordenId: string, adminId: string, nota: string | null, prisma: PrismaClient) {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { id: ordenId }, select: { estado: true } });
    return prisma.$transaction(async (tx) => {
      const d = await tx.disputa.update({
        where: { id },
        data:  { estado: "RESUELTA_VENDEDOR", resolucionNota: nota, resueltoPorId: adminId, resueltoEn: new Date() },
      });
      await tx.orden.update({ where: { id: ordenId }, data: { estado: "ENTREGADO", disputaAbierta: false, fondosLiberadosEn: new Date() } });
      await tx.historialEstadoOrden.create({
        data: { ordenId, estadoAnterior: orden.estado as never, estadoNuevo: "ENTREGADO", cambiadoPorId: adminId, notas: "Disputa resuelta a favor del vendedor" },
      });
      return d;
    });
  },
};
