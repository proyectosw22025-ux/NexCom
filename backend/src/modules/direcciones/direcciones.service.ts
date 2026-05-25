import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { direccionesRepository } from "./direcciones.repository.js";

export const direccionesService = {
  async getMias(compradorId: string, prisma: PrismaClient) {
    return direccionesRepository.findByComprador(compradorId, prisma);
  },

  async crear(
    compradorId: string,
    input: {
      alias: string;
      destinatario: string;
      calle: string;
      zona?: string | null;
      ciudad?: string;
      departamento?: string;
      referencia?: string | null;
      esPrincipal?: boolean;
    },
    prisma: PrismaClient,
  ) {
    if (!input.alias.trim()) {
      throw new GraphQLError("El alias no puede estar vacío.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (!input.destinatario.trim()) {
      throw new GraphQLError("El destinatario no puede estar vacío.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (!input.calle.trim()) {
      throw new GraphQLError("La dirección de calle no puede estar vacía.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    return direccionesRepository.create(compradorId, input, prisma);
  },

  async actualizar(
    id: string,
    compradorId: string,
    input: {
      alias?: string;
      destinatario?: string;
      calle?: string;
      zona?: string | null;
      ciudad?: string;
      departamento?: string;
      referencia?: string | null;
    },
    prisma: PrismaClient,
  ) {
    const dir = await prisma.direccion.findUnique({ where: { id }, select: { compradorId: true, activo: true } });
    if (!dir || !dir.activo) {
      throw new GraphQLError("Dirección no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (dir.compradorId !== compradorId) {
      throw new GraphQLError("No tienes permiso para editar esta dirección.", { extensions: { code: "FORBIDDEN" } });
    }
    return direccionesRepository.update(id, input, prisma);
  },

  async eliminar(id: string, compradorId: string, prisma: PrismaClient) {
    const dir = await prisma.direccion.findUnique({ where: { id }, select: { compradorId: true, activo: true } });
    if (!dir || !dir.activo) {
      throw new GraphQLError("Dirección no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (dir.compradorId !== compradorId) {
      throw new GraphQLError("No tienes permiso para eliminar esta dirección.", { extensions: { code: "FORBIDDEN" } });
    }
    return direccionesRepository.softDelete(id, prisma);
  },

  async setPrincipal(id: string, compradorId: string, prisma: PrismaClient) {
    const dir = await prisma.direccion.findUnique({ where: { id }, select: { compradorId: true, activo: true } });
    if (!dir || !dir.activo) {
      throw new GraphQLError("Dirección no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (dir.compradorId !== compradorId) {
      throw new GraphQLError("No tienes permiso para modificar esta dirección.", { extensions: { code: "FORBIDDEN" } });
    }
    return direccionesRepository.setPrincipal(id, compradorId, prisma);
  },
};
