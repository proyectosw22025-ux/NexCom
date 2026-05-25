import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { etiquetasRepository } from "./etiquetas.repository.js";

export const etiquetasService = {
  getAll(prisma: PrismaClient) {
    return etiquetasRepository.findAll(prisma);
  },

  findOrCreate(nombre: string, prisma: PrismaClient) {
    return etiquetasRepository.findOrCreate(nombre, prisma);
  },

  async create(nombre: string, prisma: PrismaClient) {
    const existing = await etiquetasRepository.findByNombre(nombre, prisma);
    if (existing) {
      throw new GraphQLError(`La etiqueta "${nombre}" ya existe.`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    return etiquetasRepository.create(nombre, prisma);
  },
};
