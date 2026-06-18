import type { PrismaClient } from "@prisma/client";

/** Enmascara el email del autor para mostrarlo públicamente (privacidad). */
function maskEmail(email: string): string {
  const [local] = email.split("@");
  if (!local) return "Usuario";
  return (local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)) + "***";
}

function mapPregunta(p: {
  id: string; productoId: string; pregunta: string; respuesta: string | null;
  respondidoEn: Date | null; creadoEn: Date; usuario: { email: string };
}) {
  return {
    id:           p.id,
    productoId:   p.productoId,
    pregunta:     p.pregunta,
    respuesta:    p.respuesta,
    respondidoEn: p.respondidoEn ? p.respondidoEn.toISOString() : null,
    creadoEn:     p.creadoEn.toISOString(),
    autor:        maskEmail(p.usuario.email),
  };
}

export const preguntasRepository = {
  async findByProducto(productoId: string, prisma: PrismaClient) {
    const rows = await prisma.preguntaProducto.findMany({
      where:   { productoId },
      include: { usuario: { select: { email: true } } },
      orderBy: { creadoEn: "desc" },
    });
    return rows.map(mapPregunta);
  },

  async create(productoId: string, usuarioId: string, pregunta: string, prisma: PrismaClient) {
    const row = await prisma.preguntaProducto.create({
      data:    { productoId, usuarioId, pregunta },
      include: { usuario: { select: { email: true } } },
    });
    return mapPregunta(row);
  },

  /** Trae la pregunta con el vendedor dueño del producto (para verificar permiso) */
  async findByIdConVendedor(id: string, prisma: PrismaClient) {
    return prisma.preguntaProducto.findUnique({
      where:   { id },
      include: { producto: { select: { vendedorId: true } } },
    });
  },

  async responder(id: string, respuesta: string, prisma: PrismaClient) {
    const row = await prisma.preguntaProducto.update({
      where:   { id },
      data:    { respuesta, respondidoEn: new Date() },
      include: { usuario: { select: { email: true } } },
    });
    return mapPregunta(row);
  },
};
