import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { ordenesRepository } from "./ordenes.repository.js";

// Estado máquina: transiciones permitidas para el vendedor
const TRANSICIONES_VENDEDOR: Record<string, string> = {
  PAGADO:         "EN_PREPARACION",
  EN_PREPARACION: "ENVIADO",
};

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
    return ordenesRepository.findByVendedor(vendedorId, prisma);
  },

  async getOrdenVendedor(id: string, vendedorId: string, prisma: PrismaClient) {
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

  async marcarEntregada(id: string, compradorId: string, usuarioId: string, prisma: PrismaClient) {
    const orden = await ordenesRepository.findOneByComprador(id, compradorId, prisma);
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "ENVIADO") {
      throw new GraphQLError(
        "Solo puedes confirmar entrega de órdenes en estado ENVIADO.",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }
    return ordenesRepository.marcarEntregada(id, usuarioId, prisma);
  },
};
