import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { ordenesRepository } from "./ordenes.repository.js";
import { saldosService } from "../saldos/saldos.service.js";
import { creditoService } from "../credito/credito.service.js";
import { generarCodigoEntrega } from "../../shared/codigo-entrega.util.js";
import { publishNotificacion } from "../../shared/pubsub.js";

// Estado máquina: transiciones permitidas para el vendedor
const TRANSICIONES_VENDEDOR: Record<string, string> = {
  PAGADO:         "EN_PREPARACION",
  EN_PREPARACION: "ENVIADO",
};

// Anti–fuerza bruta del código de entrega (escaneo del QR del paquete)
const MAX_INTENTOS_CODIGO = 5;
const BLOQUEO_CODIGO_MS   = 15 * 60 * 1000; // 15 min

// Vida del OTP de la sesión de recojo (2º factor del escaneo)
const OTP_RECOJO_TTL_MS = 10 * 60 * 1000; // 10 min

// Cierre automático: días tras la ENTREGA para pasar a COMPLETADO (finalizada)
const DIAS_CIERRE_ORDEN = 7;

// Protección al comprador: días máximos en PAGADO/EN_PREPARACION sin que el
// vendedor envíe antes de cancelar y reembolsar automáticamente la garantía.
const DIAS_CANCELACION_SIN_ENVIO = 7;

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

export const ordenesService = {
  async getMisOrdenes(compradorId: string, prisma: PrismaClient) {
    await this._cancelarOrdenesSinEnvio({ compradorId }, prisma);
    await this._cerrarOrdenesEntregadas({ compradorId }, prisma);
    return ordenesRepository.findByComprador(compradorId, prisma);
  },

  async getMiOrden(id: string, compradorId: string, prisma: PrismaClient) {
    const orden = await ordenesRepository.findOneByComprador(id, compradorId, prisma);
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    return orden;
  },

  async getOrdenesVendedor(vendedorId: string, prisma: PrismaClient) {
    await this._procesarAutoLiberaciones(vendedorId, prisma);
    await this._cancelarOrdenesSinEnvio({ vendedorId }, prisma);
    await this._cerrarOrdenesEntregadas({ vendedorId }, prisma);
    return ordenesRepository.findByVendedor(vendedorId, prisma);
  },

  async getOrdenVendedor(id: string, vendedorId: string, prisma: PrismaClient) {
    await this._procesarAutoLiberaciones(vendedorId, prisma);
    const orden = await ordenesRepository.findOneByVendedor(id, vendedorId, prisma);
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    return orden;
  },

  async getVentasPorDia(vendedorId: string, dias: number, prisma: PrismaClient) {
    // Acotar el rango a un valor razonable para evitar consultas abusivas
    const rango = Math.min(Math.max(dias, 1), 90);
    return ordenesRepository.ventasPorDia(vendedorId, rango, prisma);
  },

  async avanzarEstado(
    id: string,
    vendedorId: string,
    usuarioId: string,
    notas: string | null | undefined,
    comprobanteUrl: string | null | undefined,
    prisma: PrismaClient,
  ) {
    const orden = await ordenesRepository.findOneByVendedor(id, vendedorId, prisma);
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }

    const estadoNuevo = TRANSICIONES_VENDEDOR[orden.estado];
    if (!estadoNuevo) {
      throw new GraphQLError(
        `No se puede avanzar una orden en estado ${orden.estado}.`,
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // El comprobante solo aplica al pasar a ENVIADO
    const comprobante = estadoNuevo === "ENVIADO" ? comprobanteUrl : undefined;

    // CAS: solo avanza si la orden SIGUE en `orden.estado`. Si un proceso
    // autónomo la canceló/reembolsó en paralelo, count=0 → no la revivimos.
    const actualizada = await ordenesRepository.avanzarEstado(id, orden.estado, estadoNuevo, usuarioId, notas, comprobante, prisma);
    if (!actualizada) {
      throw new GraphQLError(
        "La orden cambió de estado (posible cancelación automática). Recárgala para ver su estado actual.",
        { extensions: { code: "CONFLICT" } },
      );
    }

    // Aviso al comprador cuando su pedido sale en camino (paso del flujo de recojo)
    if (estadoNuevo === "ENVIADO") {
      await this._notificarComprador(
        orden.compradorId, id,
        "ORDEN_ENVIADA", "¡Tu pedido está en camino! 📦",
        `Tu orden #${id.slice(-6).toUpperCase()} fue enviada. Cuando la recibas, escanea el QR del paquete para confirmar la entrega.`,
        prisma,
      );
    }
    return actualizada;
  },

  /** Notifica al comprador de una orden (best-effort: no rompe el flujo si falla). */
  async _notificarComprador(
    compradorId: string, ordenId: string, tipo: string, titulo: string, mensaje: string, prisma: PrismaClient,
  ) {
    try {
      const perfil = await prisma.perfilComprador.findUnique({ where: { id: compradorId }, select: { usuarioId: true } });
      if (!perfil) return;
      const n = await prisma.notificacion.create({
        data: { usuarioId: perfil.usuarioId, tipo, titulo, mensaje, url: `/comprador/ordenes/${ordenId}`, ordenId },
      });
      publishNotificacion(perfil.usuarioId, {
        id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
        leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
      });
    } catch (err) {
      console.error("[Ordenes] No se pudo notificar al comprador:", (err as Error).message);
    }
  },

  /** El COMPRADOR confirma la recepción → entrega + liberación de la garantía. */
  async marcarEntregada(id: string, compradorId: string, usuarioId: string, prisma: PrismaClient) {
    const orden = await ordenesRepository.findOneByComprador(id, compradorId, prisma);
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "ENVIADO") {
      throw bad("Solo puedes confirmar entrega de órdenes en estado ENVIADO.");
    }
    const updated = await ordenesRepository.marcarEntregada(id, usuarioId, prisma);
    if (!updated) throw bad("La orden ya no está en camino (fue procesada). Recárgala.");
    await this._liberar(orden.vendedorId, id, usuarioId, "LIBERACION", prisma);
    return updated;
  },

  /**
   * Paso 1 del recojo: el COMPRADOR pulsa "Recoger pedido". El sistema genera un
   * OTP temporal (segundo factor de la sesión de escaneo) ligado a la orden.
   * El escaneo del QR del paquete + este OTP prueban posesión física + identidad.
   */
  async iniciarRecojo(id: string, compradorId: string, prisma: PrismaClient) {
    const orden = await prisma.orden.findFirst({ where: { id, compradorId } });
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "ENVIADO") {
      throw bad("Solo puedes recoger pedidos que ya fueron enviados.");
    }
    const otp = generarCodigoEntrega(); // 6 dígitos CSPRNG (mismo generador que el QR)
    const otpEntregaExp = new Date(Date.now() + OTP_RECOJO_TTL_MS);
    await prisma.orden.update({ where: { id }, data: { otpEntrega: otp, otpEntregaExp } });
    return { otp, expiraEn: otpEntregaExp.toISOString() };
  },

  /**
   * Paso 2 del recojo: el COMPRADOR escanea el QR físico del paquete. El backend
   * valida las 5 condiciones del flujo de Compra Protegida:
   *   1. usuario autenticado (guard en el resolver)
   *   2. la orden pertenece al usuario (compradorId)
   *   3. QR válido (coincide con el código del paquete)
   *   4. QR no utilizado (orden aún ENVIADO, fondos no liberados)
   *   5. OTP temporal válido y vigente
   * Éxito → ENTREGADO + liberación de la garantía (idempotente) + auditoría.
   */
  async confirmarRecojo(
    id: string, compradorId: string, usuarioId: string, codigoQrRaw: string, otpRaw: string, prisma: PrismaClient,
  ) {
    const codigoQr = (codigoQrRaw ?? "").trim();
    const otp      = (otpRaw ?? "").trim();

    // 2. Pertenencia
    const orden = await prisma.orden.findFirst({ where: { id, compradorId } });
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    // 4. QR no utilizado (la orden sigue en garantía)
    if (orden.estado !== "ENVIADO" || orden.fondosLiberadosEn) {
      throw bad("Esta orden ya fue entregada o no está en camino.");
    }
    const ahora = Date.now();
    if (orden.codigoBloqueadoHasta && orden.codigoBloqueadoHasta.getTime() > ahora) {
      throw bad("Demasiados intentos. Intenta de nuevo en unos minutos.");
    }
    // 5. OTP temporal válido y vigente
    if (!orden.otpEntrega || orden.otpEntrega !== otp ||
        !orden.otpEntregaExp || orden.otpEntregaExp.getTime() < ahora) {
      throw bad("La sesión de recojo expiró. Pulsa \"Recoger pedido\" de nuevo.");
    }
    // 3. QR válido (con anti–fuerza bruta)
    if (!orden.codigoEntrega || orden.codigoEntrega !== codigoQr) {
      await this._registrarFalloCodigo(orden, usuarioId, prisma);
    }

    // Éxito → entregar (CAS) + liberar + limpiar la sesión de recojo
    const entregada = await ordenesRepository.marcarEntregada(id, usuarioId, prisma);
    if (!entregada) throw bad("Esta orden ya fue procesada o no está en camino.");
    await prisma.orden.update({
      where: { id },
      data:  { intentosCodigo: 0, codigoBloqueadoHasta: null, otpEntrega: null, otpEntregaExp: null },
    });
    await this._liberar(orden.vendedorId, id, usuarioId, "ENTREGA_ESCANEADA", prisma);
    return ordenesRepository.findOneByComprador(id, compradorId, prisma);
  },

  /** Cuenta un intento de código fallido; bloquea temporalmente al llegar al máximo. */
  async _registrarFalloCodigo(
    orden: { id: string; intentosCodigo: number }, usuarioId: string, prisma: PrismaClient,
  ): Promise<never> {
    const intentos = orden.intentosCodigo + 1;
    const bloquear = intentos >= MAX_INTENTOS_CODIGO;
    await prisma.orden.update({
      where: { id: orden.id },
      data:  bloquear
        ? { intentosCodigo: 0, codigoBloqueadoHasta: new Date(Date.now() + BLOQUEO_CODIGO_MS) }
        : { intentosCodigo: intentos },
    });
    await prisma.eventoSeguridad.create({
      data: { tipo: bloquear ? "CODIGO_BLOQUEADO" : "INTENTO_CODIGO_FALLIDO", usuarioId, ordenId: orden.id, metadata: { intentos } },
    });
    throw bad(bloquear
      ? "Código incorrecto. Por seguridad se bloqueó temporalmente; intenta en 15 minutos."
      : "El QR escaneado no corresponde a este pedido.");
  },

  /** Libera la garantía de una orden y deja registro de auditoría. Idempotente. */
  async _liberar(vendedorId: string, ordenId: string, usuarioId: string | null, tipo: string, prisma: PrismaClient) {
    await saldosService.liberarFondos(vendedorId, ordenId, prisma);
    await prisma.eventoSeguridad.create({ data: { tipo, usuarioId, ordenId } });
  },

  /**
   * Auto-liberación de respaldo: órdenes ENVIADAS cuya ventana venció sin confirmación
   * (ni disputa) se entregan y liberan automáticamente, para no dejar fondos atrapados.
   * Verificación perezosa al leer las órdenes del vendedor (O(vencidas)).
   */
  async _procesarAutoLiberaciones(vendedorId: string | null, prisma: PrismaClient) {
    const vencidas = await prisma.orden.findMany({
      where:  {
        ...(vendedorId ? { vendedorId } : {}),
        estado: "ENVIADO", fondosLiberadosEn: null, disputaAbierta: false, autoLiberaEn: { lte: new Date() },
      },
      select: { id: true, vendedorId: true },
    });
    for (const o of vencidas) {
      // CAS: solo libera si esta pasada ganó la transición a ENTREGADO. Si el
      // comprador confirmó o se abrió una disputa en paralelo, se salta.
      const entregada = await ordenesRepository.marcarEntregada(o.id, "system", prisma);
      if (entregada) await this._liberar(o.vendedorId, o.id, null, "LIBERACION_AUTO", prisma);
    }
  },

  /**
   * Barrido GLOBAL del escrow (cron): garantiza que la liberación, cancelación
   * por no-envío, cierre de órdenes y vencimiento del plan PRO ocurran aunque
   * nadie abra la app (antes eran perezosos al listar → un comprador que no
   * entraba nunca recibía su reembolso). Se ejecuta bajo lock distribuido.
   */
  async barridoEscrow(prisma: PrismaClient) {
    await this._procesarAutoLiberaciones(null, prisma);
    await this._cancelarOrdenesSinEnvio({}, prisma);
    await this._cerrarOrdenesEntregadas({}, prisma);

    // Vencimiento del plan PRO: degradar a FREE al terminar el periodo pagado
    const vencidos = await prisma.perfilVendedor.findMany({
      where:  { plan: "PRO", planVenceEn: { lte: new Date() } },
      select: { id: true, usuarioId: true },
    });
    for (const v of vencidos) {
      await prisma.perfilVendedor.update({ where: { id: v.id }, data: { plan: "FREE", planVenceEn: null } });
      try {
        const n = await prisma.notificacion.create({
          data: { usuarioId: v.usuarioId, tipo: "PLAN_VENCIDO", titulo: "Tu plan PRO venció",
            mensaje: "Volviste al plan FREE (comisión 10%). Renueva PRO desde tu panel para mantener el 5%.", url: "/vendedor/plan" },
        });
        publishNotificacion(v.usuarioId, {
          id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
          leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
        });
      } catch { /* aviso best-effort */ }
    }
  },

  /**
   * Protección al comprador (reverso de la auto-liberación): órdenes que llevan
   * más de N días en PAGADO/EN_PREPARACION sin que el vendedor las envíe se
   * CANCELAN automáticamente — reembolso desde el escrow (revierte la retención,
   * el vendedor no recibe nada), restitución de stock, auditoría y avisos.
   * Perezoso al listar órdenes; se salta las que tienen disputa abierta.
   */
  async _cancelarOrdenesSinEnvio(
    filtro: { compradorId?: string; vendedorId?: string }, prisma: PrismaClient,
  ) {
    const limite = new Date(Date.now() - DIAS_CANCELACION_SIN_ENVIO * 86_400_000);
    const vencidas = await prisma.orden.findMany({
      where: {
        ...filtro, estado: { in: ["PAGADO", "EN_PREPARACION"] },
        disputaAbierta: false, fondosLiberadosEn: null, creadoEn: { lte: limite },
      },
      select: {
        id: true, vendedorId: true, compradorId: true, estado: true, total: true,
        items: { select: { productoId: true, cantidad: true } },
      },
    });

    for (const o of vencidas) {
      // CAS + restock atómicos: solo cancela si la orden SIGUE sin enviar y sin
      // liberar. Si el vendedor la avanzó a ENVIADO justo ahora (respuesta
      // tardía), count=0 → NO se cancela ni se reembolsa: "gana quien
      // transicionó primero", sin cruce de lógica ni doble efecto.
      const gano = await prisma.$transaction(async (tx) => {
        const cas = await tx.orden.updateMany({
          where: {
            id: o.id, estado: { in: ["PAGADO", "EN_PREPARACION"] },
            fondosLiberadosEn: null, disputaAbierta: false,
          },
          data: { estado: "CANCELADO" },
        });
        if (cas.count === 0) return false;
        await tx.historialEstadoOrden.create({
          data: { ordenId: o.id, estadoAnterior: o.estado as never, estadoNuevo: "CANCELADO",
            cambiadoPorId: "system", notas: "Cancelación automática: el vendedor no envió a tiempo" },
        });
        for (const it of o.items) {
          await tx.producto.update({ where: { id: it.productoId }, data: { stock: { increment: it.cantidad } } });
        }
        return true;
      });
      if (!gano) continue; // otro flujo ya la avanzó/resolvió → no reembolsar

      // Reembolso desde el escrow (idempotente — revierte la retención exacta)
      await saldosService.registrarReembolso(o.vendedorId, o.id, prisma);
      // Acredita el total a la billetera del comprador (dinero de vuelta)
      await creditoService.acreditarReembolso(o.compradorId, o.id, new Decimal(o.total.toString()), prisma);
      await prisma.eventoSeguridad.create({
        data: { tipo: "CANCELACION_AUTO_SIN_ENVIO", ordenId: o.id, metadata: { total: o.total.toString() } },
      });
      await this._notificarComprador(
        o.compradorId, o.id, "ORDEN_CANCELADA", "Pedido cancelado y reembolsado",
        `Tu orden #${o.id.slice(-6).toUpperCase()} fue cancelada porque el vendedor no la envió a tiempo. Se acreditó Bs. ${o.total.toString()} a tu billetera.`,
        prisma,
      );
    }
  },

  /**
   * Cierre del ciclo: órdenes ENTREGADAS hace más de N días pasan a COMPLETADO
   * (finalizada) automáticamente. La valoración del comprador también las
   * completa (flujo existente); esto cubre a quienes no valoran. Perezoso
   * al listar órdenes, con historial de auditoría por orden (O(vencidas)).
   */
  async _cerrarOrdenesEntregadas(
    filtro: { compradorId?: string; vendedorId?: string }, prisma: PrismaClient,
  ) {
    const limite = new Date(Date.now() - DIAS_CIERRE_ORDEN * 86_400_000);
    const vencidas = await prisma.orden.findMany({
      where:  { ...filtro, estado: "ENTREGADO", actualizadoEn: { lte: limite } },
      select: { id: true },
    });
    for (const o of vencidas) {
      await prisma.$transaction(async (tx) => {
        // CAS: solo cierra si sigue ENTREGADO (no pisa una devolución/disputa
        // que la haya movido en paralelo).
        const cas = await tx.orden.updateMany({
          where: { id: o.id, estado: "ENTREGADO" },
          data:  { estado: "COMPLETADO" },
        });
        if (cas.count === 0) return;
        await tx.historialEstadoOrden.create({
          data: { ordenId: o.id, estadoAnterior: "ENTREGADO", estadoNuevo: "COMPLETADO", cambiadoPorId: "system", notas: "Cierre automático post-entrega" },
        });
      });
    }
  },
};
