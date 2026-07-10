import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { pagosRepository } from "./pagos.repository.js";
import { cuponesService } from "../cupones/cupones.service.js";
import { saldosService } from "../saldos/saldos.service.js";
import { fidelidadService } from "../fidelidad/fidelidad.service.js";
import { creditoService } from "../credito/credito.service.js";
import { costoEnvio, METODOS_ENTREGA } from "../../shared/envios.js";
import { publishNotificacion } from "../../shared/pubsub.js";
import { generarCodigoEntrega } from "../../shared/codigo-entrega.util.js";

// "tarjeta" = pago con tarjeta en MODO DEMO (no procesa cobro real; se confirma como
// los demás métodos simulados). La integración real con Stripe queda para §9.
const METODOS_BOLIVIANOS = ["qr", "transferencia", "contra_entrega", "tarjeta"];

type ItemCarrito = {
  productoId: string;
  cantidad: number;
  precioSnapshot: { toString: () => string };
  producto: { nombre: string; activo: boolean; stock: number; vendedorId: string };
};

export const pagosService = {
  /**
   * Valida el carrito (no vacío, stock, productos activos) y la dirección.
   * Devuelve el carrito y el snapshot de dirección. Compartido por todos los flujos.
   */
  async _validarCheckout(compradorId: string, direccionId: string, prisma: PrismaClient) {
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
    return { carrito, direccionSnapshot };
  },

  /** Crea UNA orden con todos los items del carrito (flujo Stripe legado). */
  async _prepararOrden(
    compradorId: string,
    usuarioId: string,
    direccionId: string,
    cuponCodigo: string | null | undefined,
    metodoPago: string,
    moneda: string,
    prisma: PrismaClient,
  ) {
    const { carrito, direccionSnapshot } = await this._validarCheckout(compradorId, direccionId, prisma);
    const items = carrito.items as ItemCarrito[];

    const subtotal = items.reduce(
      (acc, it) => acc.plus(new Decimal(it.precioSnapshot.toString()).mul(it.cantidad)),
      new Decimal(0),
    );
    const vendedorId = items[0]!.producto.vendedorId;

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
        items: items.map((it) => ({
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

  // ── Flujo boliviano simulado con SPLIT por vendedor ─────────────────────────────

  async crearOrdenSimulada(
    compradorId: string,
    usuarioId: string,
    direccionId: string,
    cuponCodigo: string | null | undefined,
    metodoPago: string,
    metodoEntrega: string,
    usarPuntos: boolean,
    usarCredito: boolean,
    puntoRetiro: string | null | undefined,
    prisma: PrismaClient,
  ) {
    if (!METODOS_BOLIVIANOS.includes(metodoPago)) {
      throw new GraphQLError("Método de pago inválido.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    const entrega = METODOS_ENTREGA.includes(metodoEntrega) ? metodoEntrega : "domicilio";
    // El punto de retiro solo aplica al retiro en tienda/punto
    const puntoRetiroFinal = entrega === "retiro_tienda" ? (puntoRetiro?.trim() || null) : null;
    const { carrito, direccionSnapshot } = await this._validarCheckout(compradorId, direccionId, prisma);
    const items = carrito.items as ItemCarrito[];
    // Envío por orden (por vendedor): según departamento de la dirección
    const envioPorOrden = costoEnvio(
      (direccionSnapshot as { departamento?: string }).departamento, entrega,
    );

    // Agrupar por vendedor → una orden por tienda (marketplace real)
    const grupos = new Map<string, ItemCarrito[]>();
    for (const it of items) {
      const v = it.producto.vendedorId;
      (grupos.get(v) ?? grupos.set(v, []).get(v)!).push(it);
    }
    const multiVendedor = grupos.size > 1;

    // Cupón: solo aplica a compras de una sola tienda (evita descuentos ambiguos al hacer split)
    const descuentoPorVendedor = new Map<string, Decimal>();
    let cuponId: string | null = null;
    if (cuponCodigo) {
      if (multiVendedor) {
        throw new GraphQLError("El cupón solo aplica a compras de una sola tienda.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      const vendedorUnico = [...grupos.keys()][0]!;
      const subtotalTotal = items.reduce(
        (acc, it) => acc.plus(new Decimal(it.precioSnapshot.toString()).mul(it.cantidad)), new Decimal(0),
      );
      const validacion = await cuponesService.validar(cuponCodigo, subtotalTotal.toString(), usuarioId, prisma);
      if (validacion.vendedorIdCupon && validacion.vendedorIdCupon !== vendedorUnico) {
        throw new GraphQLError("Este cupón solo aplica a productos de la tienda que lo emitió.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      descuentoPorVendedor.set(vendedorUnico, new Decimal(validacion.descuento));
      cuponId = validacion.cuponId;
    }

    // Puntos de fidelidad: solo en compras de una sola tienda (como los cupones).
    // Se descuentan sobre (subtotal - cupón) del único vendedor.
    let puntosUsados = 0;
    let descuentoPuntos = new Decimal(0);
    if (usarPuntos) {
      if (multiVendedor) {
        throw new GraphQLError("Los puntos solo se pueden canjear en compras de una sola tienda.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      const vendedorUnico = [...grupos.keys()][0]!;
      const subtotalUnico = items.reduce(
        (acc, it) => acc.plus(new Decimal(it.precioSnapshot.toString()).mul(it.cantidad)), new Decimal(0),
      );
      const base = subtotalUnico.minus(descuentoPorVendedor.get(vendedorUnico) ?? new Decimal(0));
      const cotizacion = await fidelidadService.cotizarCanje(compradorId, base, prisma);
      puntosUsados   = cotizacion.puntosUsados;
      descuentoPuntos = cotizacion.descuento;
    }

    // Crédito de la billetera: MEDIO DE PAGO (no descuento). Solo en compras de
    // una sola tienda (como puntos/cupón). El vendedor cobra el total COMPLETO;
    // el crédito solo reduce lo que el comprador paga de su bolsillo.
    let creditoDisponible = new Decimal(0);
    if (usarCredito && !multiVendedor) {
      creditoDisponible = await creditoService.getDisponible(compradorId, prisma);
    }

    const ordenIds: string[] = [];
    let totalGeneral    = new Decimal(0); // total de venta (base del vendedor)
    let pagarAhora      = new Decimal(0); // lo que el comprador paga de su bolsillo

    for (const [vendedorId, grupoItems] of grupos) {
      const subtotal = grupoItems.reduce(
        (acc, it) => acc.plus(new Decimal(it.precioSnapshot.toString()).mul(it.cantidad)), new Decimal(0),
      );
      const descuento = descuentoPorVendedor.get(vendedorId) ?? new Decimal(0);
      // descuentoPuntos solo aplica al único vendedor (single-vendor garantizado si usarPuntos)
      const descPuntosOrden = usarPuntos ? descuentoPuntos : new Decimal(0);
      const total = subtotal.minus(descuento).minus(descPuntosOrden).plus(envioPorOrden);
      // Crédito aplicado a ESTA orden (no supera el total ni el saldo restante)
      const creditoAplicado = Decimal.min(creditoDisponible, total).toDecimalPlaces(2);
      creditoDisponible = creditoDisponible.minus(creditoAplicado);

      const orden = await pagosRepository.crearOrdenConItems(
        {
          compradorId, vendedorId, direccionId, direccionSnapshot, subtotal, descuentoCupon: descuento,
          puntosUsados: usarPuntos ? puntosUsados : 0, descuentoPuntos: descPuntosOrden,
          creditoAplicado,
          costoEnvio: envioPorOrden, metodoEntrega: entrega, puntoRetiro: puntoRetiroFinal, total,
          metodoPago, moneda: "BOB",
          items: grupoItems.map((it) => ({
            productoId: it.productoId, nombreSnapshot: it.producto.nombre,
            cantidad: it.cantidad, precioUnitario: new Decimal(it.precioSnapshot.toString()),
          })),
        },
        prisma,
      );
      if (cuponId && descuento.gt(0)) {
        await pagosRepository.crearUsoCupon(cuponId, orden.id, usuarioId, descuento, prisma);
      }
      ordenIds.push(orden.id);
      totalGeneral = totalGeneral.plus(total);
      pagarAhora   = pagarAhora.plus(total.minus(creditoAplicado));
    }

    // Confirmación inmediata cuando no queda nada por pagar de bolsillo:
    //  - contra entrega (se cobra al entregar), o
    //  - el crédito de la billetera cubre el total.
    if (metodoPago === "contra_entrega" || pagarAhora.lte(0)) {
      for (const id of ordenIds) await this._confirmarOrden(id, compradorId, prisma);
      await pagosRepository.limpiarCarrito(compradorId, prisma);
    }

    return { ordenIds, metodoPago, total: pagarAhora.toString() };
  },

  /** Confirma una sola orden (PAGADO) y notifica a comprador y vendedor. */
  async _confirmarOrden(ordenId: string, compradorId: string, prisma: PrismaClient) {
    const orden = await pagosRepository.findOrdenConParticipantes(ordenId, prisma);
    if (!orden || orden.comprador?.id !== compradorId) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "PENDIENTE_PAGO") {
      throw new GraphQLError("Esta orden ya fue procesada.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    const metodo = orden.pago?.metodo ?? "qr";
    await pagosRepository.confirmarPagoSimulado(ordenId, orden.pago?.id ?? null, compradorId, metodo, prisma);

    // Compra Protegida: RETENER el neto en garantía (no disponible para el vendedor
    // hasta la confirmación de entrega) y generar el código de entrega del comprador.
    await saldosService.registrarRetencion(
      orden.vendedor!.id, ordenId, orden.total.toString(), orden.vendedor!.plan ?? "FREE", prisma,
    );
    if (!orden.codigoEntrega) {
      await prisma.orden.update({ where: { id: ordenId }, data: { codigoEntrega: generarCodigoEntrega() } });
    }

    // Billetera: debitar el crédito aplicado como pago (idempotente por orden).
    const creditoAplicado = new Decimal((orden as { creditoAplicado?: { toString(): string } }).creditoAplicado?.toString() ?? "0");
    if (creditoAplicado.gt(0)) {
      await creditoService.registrarUso(orden.comprador!.id, ordenId, creditoAplicado, prisma);
    }

    // Fidelidad: debitar puntos canjeados y acreditar puntos ganados (sobre el gasto neto)
    if (orden.puntosUsados > 0) {
      await fidelidadService.registrarCanje(orden.comprador!.id, ordenId, orden.puntosUsados, prisma);
    }
    const gastoNeto = new Decimal(orden.subtotal.toString())
      .minus(orden.descuentoCupon.toString())
      .minus(orden.descuentoPuntos.toString());
    await fidelidadService.registrarGanados(orden.comprador!.id, ordenId, gastoNeto, prisma);

    const idCorto = ordenId.slice(-6).toUpperCase();
    const eventos = [
      { usuarioId: orden.comprador!.usuarioId, tipo: "PAGO_CONFIRMADO", titulo: "¡Pedido confirmado!",
        mensaje: `Tu orden #${idCorto} fue confirmada.`, url: `/comprador/ordenes/${ordenId}` },
      { usuarioId: orden.vendedor!.usuarioId, tipo: "NUEVA_ORDEN", titulo: "Nueva orden recibida",
        mensaje: `Tienes una nueva orden #${idCorto}.`, url: `/vendedor/ordenes/${ordenId}` },
    ];
    // En paralelo: las notificaciones a comprador y vendedor son independientes
    await Promise.all(eventos.map(async (e) => {
      const notif = await prisma.notificacion.create({ data: { ...e, ordenId } });
      publishNotificacion(e.usuarioId, {
        id: notif.id, tipo: notif.tipo, titulo: notif.titulo, mensaje: notif.mensaje,
        leido: notif.leido, url: notif.url, ordenId: notif.ordenId, creadoEn: notif.creadoEn.toISOString(),
      });
    }));
  },

  /** Confirma el pago simulado de una o varias órdenes (QR / transferencia). */
  async confirmarPagoSimulado(
    ordenIds: string[],
    compradorId: string,
    _usuarioId: string,
    prisma: PrismaClient,
  ) {
    if (!ordenIds.length) {
      throw new GraphQLError("No hay órdenes para confirmar.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    for (const id of ordenIds) await this._confirmarOrden(id, compradorId, prisma);
    await pagosRepository.limpiarCarrito(compradorId, prisma);
    return { ordenIds, estado: "PAGADO" };
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
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount:   amountCents,
        currency: "usd",
        // Requerido por el PaymentElement moderno: Stripe decide los métodos a
        // mostrar (tarjeta, etc.). Sin redirects: el flujo se queda en la página
        // y el webhook confirma server-side.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        metadata: { ordenId: orden.id, compradorId, environment: "sandbox" },
      });
    } catch (err) {
      // Stripe envuelve el fallo real (red/DNS/TLS/auth) en un error genérico.
      // Registramos la causa subyacente para diagnóstico (no llega al cliente).
      const e = err as {
        type?: string; code?: string; message?: string;
        detail?: unknown; cause?: unknown; requestId?: string;
      };
      console.error("[pagos] crearPaymentIntent falló:", {
        type: e.type, code: e.code, message: e.message, requestId: e.requestId,
        detail: e.detail instanceof Error
          ? { name: e.detail.name, message: e.detail.message, code: (e.detail as { code?: string }).code }
          : e.detail,
        cause: e.cause instanceof Error
          ? { name: e.cause.name, message: e.cause.message, code: (e.cause as { code?: string }).code }
          : e.cause,
      });
      throw new GraphQLError("No se pudo iniciar el pago con tarjeta. Intenta de nuevo en unos segundos.", {
        extensions: { code: "STRIPE_CONNECTION_ERROR" },
      });
    }
    await pagosRepository.guardarStripePaymentIntentId(orden.id, intent.id, prisma);

    return { clientSecret: intent.client_secret!, ordenId: orden.id };
  },
};
