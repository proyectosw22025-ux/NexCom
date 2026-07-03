import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { ordenesRepository } from "./ordenes.repository.js";
import { saldosService } from "../saldos/saldos.service.js";
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

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

export const ordenesService = {
  async getMisOrdenes(compradorId: string, prisma: PrismaClient) {
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

    const actualizada = await ordenesRepository.avanzarEstado(id, estadoNuevo, usuarioId, notas, comprobante, prisma);

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

    // Éxito → entregar + liberar + limpiar la sesión de recojo
    await ordenesRepository.marcarEntregada(id, usuarioId, prisma);
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
  async _procesarAutoLiberaciones(vendedorId: string, prisma: PrismaClient) {
    const vencidas = await prisma.orden.findMany({
      where:  { vendedorId, estado: "ENVIADO", fondosLiberadosEn: null, disputaAbierta: false, autoLiberaEn: { lte: new Date() } },
      select: { id: true },
    });
    for (const o of vencidas) {
      await ordenesRepository.marcarEntregada(o.id, "system", prisma);
      await this._liberar(vendedorId, o.id, null, "LIBERACION_AUTO", prisma);
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
        await tx.orden.update({ where: { id: o.id }, data: { estado: "COMPLETADO" } });
        await tx.historialEstadoOrden.create({
          data: { ordenId: o.id, estadoAnterior: "ENTREGADO", estadoNuevo: "COMPLETADO", cambiadoPorId: "system", notas: "Cierre automático post-entrega" },
        });
      });
    }
  },
};
