import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { pagosRepository } from "./pagos.repository.js";
import { cuponesService } from "../cupones/cupones.service.js";
import { publishNotificacion } from "../../shared/pubsub.js";

const METODOS_BOLIVIANOS = ["qr", "transferencia", "contra_entrega"];

export const pagosService = {
  /**
   * Validación y creación de la orden (carrito, stock, dirección, subtotal,
   * cupón con scope, creación + descuento de stock + uso de cupón).
   * Compartido por el flujo Stripe y el flujo boliviano simulado.
   */
  async _prepararOrden(
    compradorId: string,
    usuarioId: string,
    direccionId: string,
    cuponCodigo: string | null | undefined,
    metodoPago: string,
    moneda: string,
    prisma: PrismaClient,
  ) {
    const carrito = await pagosRepository.findCarritoConItems(compradorId, prisma);
    if (!carrito || carrito.items.length === 0) {
      throw new GraphQLError("Tu carrito está vacío.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    for (const item of carrito.items) {
      if (!item.producto.activo) {
        throw new GraphQLError(`El producto "${item.producto.nombre}" ya no está disponible.`, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      if (item.producto.stock < item.cantidad) {
        throw new GraphQLError(
          `Stock insuficiente para "${item.producto.nombre}". Solo quedan ${item.producto.stock} unidades.`,
          { extensions: { code: "BAD_USER_INPUT" } },
        );
      }
    }

    const direccion = await pagosRepository.findDireccionConSnapshot(direccionId, prisma);
    if (!direccion || !direccion.activo) {
      throw new GraphQLError("Dirección no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    const direccionSnapshot = {
      alias: direccion.alias, destinatario: direccion.destinatario, calle: direccion.calle,
      zona: direccion.zona, ciudad: direccion.ciudad, departamento: direccion.departamento,
      referencia: direccion.referencia,
    };

    const subtotal = carrito.items.reduce(
      (acc, it) => acc.plus(new Decimal(it.precioSnapshot.toString()).mul(it.cantidad)),
      new Decimal(0),
    );
    const vendedorId = carrito.items[0]!.producto.vendedorId;

    let descuentoCupon = new Decimal(0);
    let cuponId: string | null = null;
    if (cuponCodigo) {
      const validacion = await cuponesService.validar(cuponCodigo, subtotal.toString(), usuarioId, prisma);
      if (validacion.vendedorIdCupon && validacion.vendedorIdCupon !== vendedorId) {
        throw new GraphQLError("Este cupón solo aplica a productos de la tienda que lo emitió.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      descuentoCupon = new Decimal(validacion.descuento);
      cuponId = validacion.cuponId;
    }
    const total = subtotal.minus(descuentoCupon);

    const orden = await pagosRepository.crearOrdenConItems(
      {
        compradorId, vendedorId, direccionId, direccionSnapshot, subtotal, descuentoCupon, total,
        metodoPago, moneda,
        items: carrito.items.map((it) => ({
          productoId: it.productoId, nombreSnapshot: it.producto.nombre,
          cantidad: it.cantidad, precioUnitario: new Decimal(it.precioSnapshot.toString()),
        })),
      },
      prisma,
    );
    if (cuponId) {
      await pagosRepository.crearUsoCupon(cuponId, orden.id, usuarioId, descuentoCupon, prisma);
    }
    return { orden, total };
  },

  // ── Flujo boliviano simulado (QR / transferencia / contra entrega) ──────────────

  async crearOrdenSimulada(
    compradorId: string,
    usuarioId: string,
    direccionId: string,
    cuponCodigo: string | null | undefined,
    metodoPago: string,
    prisma: PrismaClient,
  ) {
    if (!METODOS_BOLIVIANOS.includes(metodoPago)) {
      throw new GraphQLError("Método de pago inválido.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    const { orden } = await this._prepararOrden(
      compradorId, usuarioId, direccionId, cuponCodigo, metodoPago, "BOB", prisma,
    );
    // Contra entrega: la orden se confirma de inmediato (se cobra al entregar)
    if (metodoPago === "contra_entrega") {
      await this.confirmarPagoSimulado(orden.id, compradorId, usuarioId, prisma);
    }
    return { ordenId: orden.id, metodoPago, total: orden.total.toString() };
  },

  async confirmarPagoSimulado(
    ordenId: string,
    compradorId: string,
    _usuarioId: string,
    prisma: PrismaClient,
  ) {
    const orden = await pagosRepository.findOrdenConParticipantes(ordenId, prisma);
    if (!orden || orden.comprador?.id !== compradorId) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "PENDIENTE_PAGO") {
      throw new GraphQLError("Esta orden ya fue procesada.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const metodo = orden.pago?.metodo ?? "qr";
    await pagosRepository.confirmarPagoSimulado(ordenId, orden.pago?.id ?? null, compradorId, metodo, prisma);
    await pagosRepository.limpiarCarrito(compradorId, prisma);

    // Notificaciones a comprador y vendedor (infra en tiempo real ya existente)
    const idCorto = ordenId.slice(-6).toUpperCase();
    const eventos = [
      { usuarioId: orden.comprador!.usuarioId, tipo: "PAGO_CONFIRMADO", titulo: "¡Pedido confirmado!",
        mensaje: `Tu orden #${idCorto} fue confirmada.`, url: `/comprador/ordenes/${ordenId}` },
      { usuarioId: orden.vendedor!.usuarioId, tipo: "NUEVA_ORDEN", titulo: "Nueva orden recibida",
        mensaje: `Tienes una nueva orden #${idCorto}.`, url: `/vendedor/ordenes/${ordenId}` },
    ];
    for (const e of eventos) {
      const notif = await prisma.notificacion.create({ data: { ...e, ordenId } });
      publishNotificacion(e.usuarioId, {
        id: notif.id, tipo: notif.tipo, titulo: notif.titulo, mensaje: notif.mensaje,
        leido: notif.leido, url: notif.url, ordenId: notif.ordenId, creadoEn: notif.creadoEn.toISOString(),
      });
    }

    return { ordenId, estado: "PAGADO", metodo };
  },

  async crearPaymentIntent(
    compradorId: string,
    usuarioId: string,
    direccionId: string,
    cuponCodigo: string | null | undefined,
    prisma: PrismaClient,
    stripe: Stripe,
  ) {
    const { orden, total } = await this._prepararOrden(
      compradorId, usuarioId, direccionId, cuponCodigo, "card", "USD", prisma,
    );

    // Crear Stripe PaymentIntent (amount en centavos USD) — flujo legado/sandbox
    const amountCents = total.mul(100).toDecimalPlaces(0).toNumber();
    const intent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: "usd",
      metadata: {
        ordenId:     orden.id,
        compradorId,
        environment: "sandbox",
      },
    });

    // 10. Guardar PI ID en la orden
    await pagosRepository.guardarStripePaymentIntentId(orden.id, intent.id, prisma);

    return {
      clientSecret: intent.client_secret!,
      ordenId:      orden.id,
    };
  },
};
