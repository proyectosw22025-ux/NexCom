import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { notificacionesRepository } from "./notificaciones.repository.js";

export const notificacionesService = {
  async getMisNotificaciones(usuarioId: string, prisma: PrismaClient) {
    return notificacionesRepository.findByUsuario(usuarioId, prisma);
  },

  async getNoLeidas(usuarioId: string, prisma: PrismaClient) {
    return notificacionesRepository.countNoLeidas(usuarioId, prisma);
  },

  async marcarLeida(id: string, usuarioId: string, prisma: PrismaClient) {
    const n = await notificacionesRepository.marcarLeida(id, usuarioId, prisma);
    if (!n) {
      throw new GraphQLError("Notificación no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    return n;
  },

  async marcarTodasLeidas(usuarioId: string, prisma: PrismaClient) {
    return notificacionesRepository.marcarTodasLeidas(usuarioId, prisma);
  },
};
