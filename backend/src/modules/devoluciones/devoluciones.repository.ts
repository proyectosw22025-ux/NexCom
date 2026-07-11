import type { PrismaClient } from "@prisma/client";
import type { Decimal } from "decimal.js";

export const devolucionesRepository = {
  /** Orden con lo necesario para validar una solicitud de devolución. */
  async findOrdenParaDevolucion(ordenId: string, prisma: PrismaClient) {
    return prisma.orden.findUnique({
      where: { id: ordenId },
      select: {
        id: true, estado: true, total: true,
        comprador: { select: { id: true, usuarioId: true } },
        vendedor:  { select: { id: true, usuarioId: true, nombreNegocio: true } },
        items: { select: { productoId: true, cantidad: true } },
        devolucion: { select: { id: true } },
        // fecha de entrega (para la ventana de devolución)
        historialEstados: {
          where:   { estadoNuevo: "ENTREGADO" },
          orderBy: { creadoEn: "desc" },
          take:    1,
          select:  { creadoEn: true },
        },
      },
    });
  },

  async crear(
    data: {
      ordenId: string; compradorId: string; vendedorId: string; motivo: string;
      tipoProblema: string; evidenciaUrls: string[]; montoReembolso: Decimal;
    },
    prisma: PrismaClient,
  ) {
    return prisma.devolucion.create({
      data: {
        ordenId:        data.ordenId,
        compradorId:    data.compradorId,
        vendedorId:     data.vendedorId,
        motivo:         data.motivo,
        tipoProblema:   data.tipoProblema,
        evidenciaUrls:  data.evidenciaUrls,
        montoReembolso: data.montoReembolso.toString(),
      },
    });
  },

  /** Devolución con sus participantes (para autorizar al resolver). */
  async findConParticipantes(id: string, prisma: PrismaClient) {
    return prisma.devolucion.findUnique({
      where: { id },
      select: {
        id: true, estado: true, ordenId: true, montoReembolso: true,
        comprador: { select: { id: true, usuarioId: true } },
        vendedor:  { select: { id: true, usuarioId: true } },
        orden:     { select: { items: { select: { productoId: true, cantidad: true } } } },
      },
    });
  },

  async rechazar(id: string, respuesta: string | null, prisma: PrismaClient) {
    return prisma.devolucion.update({
      where: { id },
      data:  { estado: "RECHAZADA", respuestaVendedor: respuesta },
    });
  },

  /**
   * Aprueba el reembolso de forma atómica: marca REEMBOLSADA y devuelve el stock
   * de cada ítem de la orden al inventario (transacción).
   *
   * CAS por estado: la transición SOLICITADA → REEMBOLSADA solo la gana UN
   * proceso. Sin esto, si el vendedor aprueba justo cuando el cron
   * `autoResolverVencidas` la resuelve (o ante un doble clic), el stock se
   * repondría dos veces (los movimientos de dinero ya son idempotentes, pero el
   * `increment` de stock no). El restock ocurre solo en la pasada ganadora.
   */
  async reembolsar(
    id: string,
    respuesta: string | null,
    items: { productoId: string; cantidad: number }[],
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      const cas = await tx.devolucion.updateMany({
        where: { id, estado: "SOLICITADA" },
        data:  { estado: "REEMBOLSADA", respuestaVendedor: respuesta },
      });
      if (cas.count === 1) {
        for (const it of items) {
          await tx.producto.update({
            where: { id: it.productoId },
            data:  { stock: { increment: it.cantidad } },
          });
        }
      }
      return tx.devolucion.findUnique({ where: { id } });
    });
  },

  async findByComprador(compradorId: string, prisma: PrismaClient) {
    return prisma.devolucion.findMany({
      where:   { compradorId },
      orderBy: { creadoEn: "desc" },
      include: { vendedor: { select: { nombreNegocio: true } } },
    });
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    return prisma.devolucion.findMany({
      where:   { vendedorId },
      orderBy: { creadoEn: "desc" },
      include: { comprador: { select: { nombreCompleto: true } } },
    });
  },

  async findByOrden(ordenId: string, prisma: PrismaClient) {
    return prisma.devolucion.findUnique({ where: { ordenId } });
  },

  /** Devoluciones SOLICITADAS sin responder desde hace más de `limite` (auto-resolución). */
  async findSolicitadasVencidas(limite: Date, prisma: PrismaClient) {
    return prisma.devolucion.findMany({
      where:  { estado: "SOLICITADA", creadoEn: { lte: limite } },
      select: {
        id: true, ordenId: true, montoReembolso: true,
        comprador: { select: { id: true, usuarioId: true } },
        vendedor:  { select: { id: true, usuarioId: true } },
        orden:     { select: { items: { select: { productoId: true, cantidad: true } } } },
      },
    });
  },
};
