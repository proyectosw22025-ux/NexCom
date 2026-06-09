import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { configSistemaRepository } from "./config-sistema.repository.js";

export const configSistemaService = {
  async getAll(prisma: PrismaClient) {
    return configSistemaRepository.findAll(prisma);
  },

  async getByClave(clave: string, prisma: PrismaClient) {
    return configSistemaRepository.findByClave(clave, prisma);
  },

  async update(clave: string, valor: string, prisma: PrismaClient) {
    const config = await configSistemaRepository.findByClave(clave, prisma);
    if (!config) {
      throw new GraphQLError(`Clave de configuración "${clave}" no existe.`, {
        extensions: { code: "NOT_FOUND" },
      });
    }

    if (config.tipo === "NUMBER" && isNaN(Number(valor))) {
      throw new GraphQLError("El valor debe ser numérico para esta configuración.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (config.tipo === "BOOLEAN" && valor !== "true" && valor !== "false") {
      throw new GraphQLError("El valor debe ser 'true' o 'false' para esta configuración.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    return configSistemaRepository.update(clave, valor, prisma);
  },
};
