import type { PrismaClient } from "@prisma/client";

function mapNotificacion(n: {
  id: string; tipo: string; titulo: string; mensaje: string;
  leido: boolean; url: string | null; ordenId: string | null; creadoEn: Date;
}) {
  return { ...n, creadoEn: n.creadoEn.toISOString() };
}

export const notificacionesRepository = {
  async findByUsuario(usuarioId: string, prisma: PrismaClient) {
    const notifs = await prisma.notificacion.findMany({
      where:   { usuarioId },
      orderBy: { creadoEn: "desc" },
      take:    50,
    });
    return notifs.map(mapNotificacion);
  },

  async countNoLeidas(usuarioId: string, prisma: PrismaClient) {
    return prisma.notificacion.count({ where: { usuarioId, leido: false } });
  },

  async marcarLeida(id: string, usuarioId: string, prisma: PrismaClient) {
    const n = await prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data:  { leido: true },
    });
    if (n.count === 0) return null;
    const updated = await prisma.notificacion.findUnique({ where: { id } });
    return updated ? mapNotificacion(updated) : null;
  },

  async marcarTodasLeidas(usuarioId: string, prisma: PrismaClient) {
    await prisma.notificacion.updateMany({
      where: { usuarioId, leido: false },
      data:  { leido: true },
    });
    return true;
  },
};
