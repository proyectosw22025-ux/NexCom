import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { valoracionesRepository } from "./valoraciones.repository.js";

export const valoracionesService = {
  async getMisValoraciones(compradorId: string, prisma: PrismaClient) {
    return valoracionesRepository.findByComprador(compradorId, prisma);
  },

  async getValoracionesDeVendedor(vendedorId: string, prisma: PrismaClient) {
    return valoracionesRepository.findByVendedor(vendedorId, prisma);
  },

  async getValoracionesRecibidas(vendedorId: string, prisma: PrismaClient) {
    return valoracionesRepository.findByVendedor(vendedorId, prisma);
  },

  async crear(
    compradorId: string,
    input: { ordenId: string; calificacion: number; comentario?: string | null },
    prisma: PrismaClient,
  ) {
    if (input.calificacion < 1 || input.calificacion > 5) {
      throw new GraphQLError("La calificación debe ser entre 1 y 5.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    // Verificar que la orden pertenece al cliente y está ENTREGADO
    const orden = await prisma.orden.findFirst({
      where: { id: input.ordenId, compradorId },
    });
    if (!orden) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (orden.estado !== "ENTREGADO") {
      throw new GraphQLError(
        "Solo puedes valorar órdenes en estado ENTREGADO.",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // Verificar que no existe ya una valoración
    const existente = await valoracionesRepository.findByOrden(input.ordenId, prisma);
    if (existente) {
      throw new GraphQLError("Ya valoraste esta orden.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    return valoracionesRepository.create(
      {
        ordenId:      input.ordenId,
        compradorId,
        vendedorId:   orden.vendedorId,
        calificacion: input.calificacion,
        comentario:   input.comentario,
      },
      prisma,
    );
  },

  async responder(
    valoracionId: string,
    vendedorId: string,
    respuesta: string,
    prisma: PrismaClient,
  ) {
    if (!respuesta.trim()) {
      throw new GraphQLError("La respuesta no puede estar vacía.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const valoracion = await prisma.valoracion.findUnique({ where: { id: valoracionId } });
    if (!valoracion || valoracion.vendedorId !== vendedorId) {
      throw new GraphQLError("Valoración no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }

    return valoracionesRepository.responder(valoracionId, vendedorId, respuesta, prisma);
  },
};
