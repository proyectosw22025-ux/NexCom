import type { PrismaClient } from "@prisma/client";

const convInclude = {
  comprador: { select: { usuarioId: true, nombreCompleto: true } },
  vendedor:  { select: { usuarioId: true, nombreNegocio: true } },
  mensajes:  { orderBy: { creadoEn: "desc" as const }, take: 1 },
} as const;

export const mensajesRepository = {
  async findConversaciones(
    where: { compradorId?: string; vendedorId?: string },
    prisma: PrismaClient,
  ) {
    return prisma.conversacion.findMany({ where, include: convInclude, orderBy: { creadoEn: "desc" } });
  },

  /** Mapa conversacionId → nº de mensajes no leídos enviados por el otro. */
  async contarNoLeidos(conversacionIds: string[], usuarioId: string, prisma: PrismaClient) {
    if (conversacionIds.length === 0) return new Map<string, number>();
    const grupos = await prisma.mensaje.groupBy({
      by:    ["conversacionId"],
      where: { conversacionId: { in: conversacionIds }, leido: false, emisorId: { not: usuarioId } },
      _count: { _all: true },
    });
    return new Map(grupos.map((g) => [g.conversacionId, g._count._all]));
  },

  async findParticipantes(conversacionId: string, prisma: PrismaClient) {
    return prisma.conversacion.findUnique({
      where:   { id: conversacionId },
      include: {
        comprador: { select: { usuarioId: true } },
        vendedor:  { select: { usuarioId: true } },
      },
    });
  },

  async findOrCreate(compradorId: string, vendedorId: string, productoId: string | null, prisma: PrismaClient) {
    const existente = await prisma.conversacion.findFirst({ where: { compradorId, vendedorId, productoId } });
    if (existente) return existente;
    return prisma.conversacion.create({ data: { compradorId, vendedorId, productoId } });
  },

  async crearMensaje(conversacionId: string, emisorId: string, contenido: string, prisma: PrismaClient) {
    return prisma.mensaje.create({ data: { conversacionId, emisorId, contenido } });
  },

  async findMensajes(conversacionId: string, prisma: PrismaClient) {
    return prisma.mensaje.findMany({ where: { conversacionId }, orderBy: { creadoEn: "asc" } });
  },

  async marcarLeidos(conversacionId: string, usuarioId: string, prisma: PrismaClient) {
    await prisma.mensaje.updateMany({
      where: { conversacionId, leido: false, emisorId: { not: usuarioId } },
      data:  { leido: true },
    });
  },
};
