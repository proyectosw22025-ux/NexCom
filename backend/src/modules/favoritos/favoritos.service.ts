import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { favoritosRepository } from "./favoritos.repository.js";

export const favoritosService = {
  async getAll(compradorId: string, prisma: PrismaClient) {
    return favoritosRepository.findAll(compradorId, prisma);
  },

  async check(compradorId: string, productoId: string, prisma: PrismaClient): Promise<boolean> {
    return favoritosRepository.exists(compradorId, productoId, prisma);
  },

  async toggle(compradorId: string, productoId: string, prisma: PrismaClient): Promise<boolean> {
    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto || !producto.activo) {
      throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    }

    const existe = await favoritosRepository.exists(compradorId, productoId, prisma);
    if (existe) {
      return favoritosRepository.remove(compradorId, productoId, prisma); // false
    }
    return favoritosRepository.add(compradorId, productoId, prisma); // true
  },
};
