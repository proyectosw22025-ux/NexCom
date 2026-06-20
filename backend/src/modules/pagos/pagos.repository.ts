import { GraphQLError } from "graphql";
import type { PrismaClient, EstadoOrden, EstadoPago } from "@prisma/client";
import { Decimal } from "decimal.js";

export const pagosRepository = {
  async findCarritoConItems(compradorId: string, prisma: PrismaClient) {
    return prisma.carrito.findUnique({
      where:   { compradorId },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id:         true,
                nombre:     true,
                precio:     true,
                stock:      true,
                activo:     true,
                vendedorId: true,
              },
            },
          },
          orderBy: { agregadoEn: "asc" },
        },
      },
    });
  },

  async findDireccionConSnapshot(id: string, prisma: PrismaClient) {
    return prisma.direccion.findUnique({ where: { id } });
  },

  async crearOrdenConItems(
    data: {
      compradorId:      string;
      vendedorId:       string;
      direccionId:      string;
      direccionSnapshot: object;
      subtotal:         Decimal;
      descuentoCupon:   Decimal;
      puntosUsados?:    number;
      descuentoPuntos?: Decimal;
      costoEnvio?:      Decimal;
      metodoEntrega?:   string; // "domicilio" | "retiro_tienda"
      total:            Decimal;
      items: { productoId: string; nombreSnapshot: string; cantidad: number; precioUnitario: Decimal }[];
      metodoPago?:      string; // "card" (Stripe) | "qr" | "transferencia" | "contra_entrega"
      moneda?:          string; // default BOB (Bolivianos)
    },
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          compradorId:      data.compradorId,
          vendedorId:       data.vendedorId,
          direccionId:      data.direccionId,
          direccionSnapshot: data.direccionSnapshot,
          subtotal:         data.subtotal,
          descuentoCupon:   data.descuentoCupon,
          puntosUsados:     data.puntosUsados ?? 0,
          descuentoPuntos:  data.descuentoPuntos ?? 0,
          costoEnvio:       data.costoEnvio ?? 0,
          metodoEntrega:    data.metodoEntrega ?? "domicilio",
          total:            data.total,
          estado:           "PENDIENTE_PAGO",
          items: {
            create: data.items.map((it) => ({
              productoId:     it.productoId,
              nombreSnapshot: it.nombreSnapshot,
              cantidad:       it.cantidad,
              precioUnitario: it.precioUnitario,
              subtotal:       it.precioUnitario.mul(it.cantidad),
            })),
          },
        },
      });

      // Crear pago en estado PENDIENTE
      await tx.pago.create({
        data: {
          ordenId: orden.id,
          monto:   data.total,
          moneda:  data.moneda ?? "BOB",
          metodo:  data.metodoPago ?? "card",
          estado:  "PENDIENTE",
        },
      });

      // Descontar stock de forma ATÓMICA y condicional: el UPDATE solo aplica si
      // aún hay stock suficiente (WHERE stock >= cantidad). Si dos compras compiten
      // por la última unidad, solo una afecta filas; la otra obtiene count 0 y se
      // revierte toda la transacción → sin sobreventa bajo concurrencia.
      for (const it of data.items) {
        const res = await tx.producto.updateMany({
          where: { id: it.productoId, stock: { gte: it.cantidad } },
          data:  { stock: { decrement: it.cantidad } },
        });
        if (res.count === 0) {
          throw new GraphQLError(
            `Stock insuficiente para "${it.nombreSnapshot}". Otro comprador acaba de tomar las últimas unidades.`,
            { extensions: { code: "BAD_USER_INPUT" } },
          );
        }
      }

      // Crear historial de estado inicial
      await tx.historialEstadoOrden.create({
        data: {
          ordenId:      orden.id,
          estadoNuevo:  "PENDIENTE_PAGO",
          cambiadoPorId: data.compradorId,
          notas:        "Orden creada — esperando pago",
        },
      });

      return orden;
    });
  },

  async guardarStripePaymentIntentId(ordenId: string, intentId: string, prisma: PrismaClient) {
    await prisma.orden.update({
      where: { id: ordenId },
      data:  { stripePaymentIntentId: intentId },
    });
  },

  async findOrdenByPaymentIntentId(intentId: string, prisma: PrismaClient) {
    return prisma.orden.findUnique({
      where:   { stripePaymentIntentId: intentId },
      include: {
        pago:  true,
        items: { include: { producto: { select: { id: true } } } },
      },
    });
  },

  async confirmarPago(
    ordenId: string,
    pagoId: string,
    chargeId: string,
    compradorId: string,
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.orden.update({
        where: { id: ordenId },
        data:  { estado: "PAGADO" },
      });
      await tx.pago.update({
        where: { id: pagoId },
        data:  { estado: "COMPLETADO", stripeChargeId: chargeId },
      });
      await tx.historialEstadoOrden.create({
        data: {
          ordenId,
          estadoAnterior: "PENDIENTE_PAGO",
          estadoNuevo:    "PAGADO",
          cambiadoPorId:  compradorId,
          notas:          "Pago confirmado vía Stripe",
        },
      });
    });
  },

  async fallarPago(
    orden: {
      id: string;
      compradorId: string;
      pago: { id: string } | null;
      items: { productoId: string; cantidad: number }[];
    },
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.orden.update({
        where: { id: orden.id },
        data:  { estado: "CANCELADO" },
      });
      if (orden.pago) {
        await tx.pago.update({
          where: { id: orden.pago.id },
          data:  { estado: "FALLIDO" },
        });
      }
      // Restituir stock
      for (const it of orden.items) {
        await tx.producto.update({
          where: { id: it.productoId },
          data:  { stock: { increment: it.cantidad } },
        });
      }
      await tx.historialEstadoOrden.create({
        data: {
          ordenId:       orden.id,
          estadoAnterior: "PENDIENTE_PAGO",
          estadoNuevo:    "CANCELADO",
          cambiadoPorId:  orden.compradorId,
          notas:          "Pago fallido — stock restituido",
        },
      });
    });
  },

  // ── Flujo de pago simulado (Bolivia: QR / transferencia / contra entrega) ──────

  async findOrdenConParticipantes(ordenId: string, prisma: PrismaClient) {
    return prisma.orden.findUnique({
      where:   { id: ordenId },
      include: {
        pago:      true,
        comprador: { select: { id: true, usuarioId: true } },
        vendedor:  { select: { id: true, usuarioId: true, plan: true } },
      },
    });
  },

  async confirmarPagoSimulado(
    ordenId: string,
    pagoId: string | null,
    compradorId: string,
    metodo: string,
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.orden.update({ where: { id: ordenId }, data: { estado: "PAGADO" } });
      if (pagoId) {
        await tx.pago.update({ where: { id: pagoId }, data: { estado: "COMPLETADO" } });
      }
      await tx.historialEstadoOrden.create({
        data: {
          ordenId,
          estadoAnterior: "PENDIENTE_PAGO",
          estadoNuevo:    "PAGADO",
          cambiadoPorId:  compradorId,
          notas:          `Pago confirmado (${metodo})`,
        },
      });
    });
  },

  async crearUsoCupon(
    cuponId: string,
    ordenId: string,
    usuarioId: string,
    descuento: Decimal,
    prisma: PrismaClient,
  ) {
    await prisma.usoCupon.create({
      data: { cuponId, ordenId, usuarioId, descuento },
    });
    await prisma.cupon.update({
      where: { id: cuponId },
      data:  { usosActuales: { increment: 1 } },
    });
  },

  async limpiarCarrito(compradorId: string, prisma: PrismaClient) {
    const carrito = await prisma.carrito.findUnique({ where: { compradorId } });
    if (carrito) {
      await prisma.itemCarrito.deleteMany({ where: { carritoId: carrito.id } });
    }
  },
};
