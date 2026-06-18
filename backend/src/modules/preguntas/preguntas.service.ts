import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { preguntasRepository } from "./preguntas.repository.js";

export const preguntasService = {
  async getByProducto(productoId: string, prisma: PrismaClient) {
    return preguntasRepository.findByProducto(productoId, prisma);
  },

  async crear(productoId: string, usuarioId: string, pregunta: string, prisma: PrismaClient) {
    const texto = pregunta.trim();
    if (texto.length < 5) {
      throw new GraphQLError("La pregunta es demasiado corta.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (texto.length > 500) {
      throw new GraphQLError("La pregunta es demasiado larga (máx. 500 caracteres).", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    const producto = await prisma.producto.findUnique({ where: { id: productoId }, select: { id: true } });
    if (!producto) {
      throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    }
    return preguntasRepository.create(productoId, usuarioId, texto, prisma);
  },

  async responder(preguntaId: string, vendedorId: string, respuesta: string, prisma: PrismaClient) {
    const texto = respuesta.trim();
    if (!texto) {
      throw new GraphQLError("La respuesta no puede estar vacía.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    const pregunta = await preguntasRepository.findByIdConVendedor(preguntaId, prisma);
    if (!pregunta) {
      throw new GraphQLError("Pregunta no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    // Solo el vendedor dueño del producto puede responder
    if (pregunta.producto.vendedorId !== vendedorId) {
      throw new GraphQLError("No puedes responder preguntas de productos de otra tienda.", {
        extensions: { code: "FORBIDDEN" },
      });
    }
    return preguntasRepository.responder(preguntaId, texto, prisma);
  },
};
