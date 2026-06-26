import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { ordenesRepository } from "./ordenes.repository.js";
import { saldosService } from "../saldos/saldos.service.js";

// Estado máquina: transiciones permitidas para el vendedor
const TRANSICIONES_VENDEDOR: Record<string, string> = {
  PAGADO:         "EN_PREPARACION",
  EN_PREPARACION: "ENVIADO",
};

// Anti–fuerza bruta del código de entrega (handshake en la entrega física)
const MAX_INTENTOS_CODIGO = 5;
const BLOQUEO_CODIGO_MS   = 15 * 60 * 1000; // 15 min

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

export const ordenesService = {
  async getMisOrdenes(compradorId: string, prisma: PrismaClient) {
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

    return ordenesRepository.avanzarEstado(id, estadoNuevo, usuarioId, notas, comprobante, prisma);
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
   * El VENDEDOR/repartidor confirma la entrega ingresando el código que el comprador
   * le muestra al recibir (handshake). Verifica el código con anti–fuerza bruta,
   * marca ENTREGADO y libera la garantía. Idempotente vía LIBERACION.
   */
  async confirmarEntregaConCodigo(
    id: string, vendedorId: string, usuarioId: string, codigoRaw: string, prisma: PrismaClient,
  ) {
    const codigo = (codigoRaw ?? "").trim();
    const orden = await prisma.orden.findFirst({ where: { id, vendedorId } });
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "ENVIADO") {
      throw bad("Solo puedes confirmar entrega de órdenes en estado ENVIADO.");
    }
    const ahora = Date.now();
    if (orden.codigoBloqueadoHasta && orden.codigoBloqueadoHasta.getTime() > ahora) {
      throw bad("Demasiados intentos. Intenta de nuevo en unos minutos.");
    }
    if (!orden.codigoEntrega || orden.codigoEntrega !== codigo) {
      const intentos = orden.intentosCodigo + 1;
      const bloquear = intentos >= MAX_INTENTOS_CODIGO;
      await prisma.orden.update({
        where: { id },
        data:  bloquear
          ? { intentosCodigo: 0, codigoBloqueadoHasta: new Date(ahora + BLOQUEO_CODIGO_MS) }
          : { intentosCodigo: intentos },
      });
      await prisma.eventoSeguridad.create({
        data: { tipo: bloquear ? "CODIGO_BLOQUEADO" : "INTENTO_CODIGO_FALLIDO", usuarioId, ordenId: id, metadata: { intentos } },
      });
      throw bad(bloquear
        ? "Código incorrecto. Por seguridad se bloqueó temporalmente; intenta en 15 minutos."
        : "Código de entrega incorrecto.");
    }
    // Código correcto → entregar + liberar
    await ordenesRepository.marcarEntregada(id, usuarioId, prisma);
    await prisma.orden.update({ where: { id }, data: { intentosCodigo: 0, codigoBloqueadoHasta: null } });
    await this._liberar(vendedorId, id, usuarioId, "LIBERACION", prisma);
    return ordenesRepository.findOneByVendedor(id, vendedorId, prisma);
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
};
