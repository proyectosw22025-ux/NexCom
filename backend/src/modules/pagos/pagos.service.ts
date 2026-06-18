import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { pagosRepository } from "./pagos.repository.js";
import { cuponesService } from "../cupones/cupones.service.js";

export const pagosService = {
  async crearPaymentIntent(
    compradorId: string,
    usuarioId: string,
    direccionId: string,
    cuponCodigo: string | null | undefined,
    prisma: PrismaClient,
    stripe: Stripe,
  ) {
    // 1. Obtener carrito con items
    const carrito = await pagosRepository.findCarritoConItems(compradorId, prisma);
    if (!carrito || carrito.items.length === 0) {
      throw new GraphQLError("Tu carrito está vacío.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    // 2. Verificar stock y que todos los productos están activos
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

    // 3. Obtener dirección y crear snapshot
    const direccion = await pagosRepository.findDireccionConSnapshot(direccionId, prisma);
    if (!direccion || !direccion.activo) {
      throw new GraphQLError("Dirección no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }

    const direccionSnapshot = {
      alias:        direccion.alias,
      destinatario: direccion.destinatario,
      calle:        direccion.calle,
      zona:         direccion.zona,
      ciudad:       direccion.ciudad,
      departamento: direccion.departamento,
      referencia:   direccion.referencia,
    };

    // 4. Calcular subtotal
    const subtotal = carrito.items.reduce(
      (acc, it) => acc.plus(new Decimal(it.precioSnapshot.toString()).mul(it.cantidad)),
      new Decimal(0),
    );

    // Vendedor principal (primer item) — necesario para validar el scope del cupón
    const vendedorId = carrito.items[0]!.producto.vendedorId;

    // 5. Validar y aplicar cupón si se provee
    let descuentoCupon = new Decimal(0);
    let cuponId: string | null = null;
    if (cuponCodigo) {
      const validacion = await cuponesService.validar(cuponCodigo, subtotal.toString(), usuarioId, prisma);
      // Scope: un cupón de vendedor solo aplica a órdenes de su tienda
      if (validacion.vendedorIdCupon && validacion.vendedorIdCupon !== vendedorId) {
        throw new GraphQLError("Este cupón solo aplica a productos de la tienda que lo emitió.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      descuentoCupon = new Decimal(validacion.descuento);
      cuponId = validacion.cuponId;
    }

    const total = subtotal.minus(descuentoCupon);

    // 7. Crear orden + items + descontar stock en una transacción
    const orden = await pagosRepository.crearOrdenConItems(
      {
        compradorId,
        vendedorId,
        direccionId,
        direccionSnapshot,
        subtotal,
        descuentoCupon,
        total,
        items: carrito.items.map((it) => ({
          productoId:     it.productoId,
          nombreSnapshot: it.producto.nombre,
          cantidad:       it.cantidad,
          precioUnitario: new Decimal(it.precioSnapshot.toString()),
        })),
      },
      prisma,
    );

    // 8. Registrar uso de cupón
    if (cuponId) {
      await pagosRepository.crearUsoCupon(cuponId, orden.id, usuarioId, descuentoCupon, prisma);
    }

    // 9. Crear Stripe PaymentIntent (amount en centavos USD)
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
