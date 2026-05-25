import type { PrismaClient } from "@prisma/client";

const valoracionInclude = {
  respuesta: true,
} as const;

function mapValoracion(v: {
  id: string; ordenId: string; compradorId: string; vendedorId: string;
  calificacion: number; comentario: string | null; creadoEn: Date;
  respuesta: { id: string; respuesta: string; creadoEn: Date } | null;
}) {
  return {
    ...v,
    creadoEn: v.creadoEn.toISOString(),
    respuesta: v.respuesta
      ? { ...v.respuesta, creadoEn: v.respuesta.creadoEn.toISOString() }
      : null,
  };
}

export const valoracionesRepository = {
  async findByComprador(compradorId: string, prisma: PrismaClient) {
    const vals = await prisma.valoracion.findMany({
      where:   { compradorId },
      include: valoracionInclude,
      orderBy: { creadoEn: "desc" },
    });
    return vals.map(mapValoracion);
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    const vals = await prisma.valoracion.findMany({
      where:   { vendedorId },
      include: valoracionInclude,
      orderBy: { creadoEn: "desc" },
    });
    return vals.map(mapValoracion);
  },

  async findByOrden(ordenId: string, prisma: PrismaClient) {
    const v = await prisma.valoracion.findUnique({
      where:   { ordenId },
      include: valoracionInclude,
    });
    return v ? mapValoracion(v) : null;
  },

  async create(
    data: {
      ordenId: string;
      compradorId: string;
      vendedorId: string;
      calificacion: number;
      comentario?: string | null;
    },
    prisma: PrismaClient,
  ) {
    const v = await prisma.$transaction(async (tx) => {
      const val = await tx.valoracion.create({
        data: {
          ordenId:      data.ordenId,
          compradorId:  data.compradorId,
          vendedorId:   data.vendedorId,
          calificacion: data.calificacion,
          comentario:   data.comentario ?? null,
        },
        include: valoracionInclude,
      });

      // Actualizar rating promedio del vendedor
      const stats = await tx.valoracion.aggregate({
        where: { vendedorId: data.vendedorId },
        _avg:  { calificacion: true },
        _count: true,
      });
      await tx.perfilVendedor.update({
        where: { id: data.vendedorId },
        data: {
          ratingPromedio: stats._avg.calificacion ?? 0,
          totalResenias:  stats._count,
        },
      });

      // Marcar orden como COMPLETADO
      await tx.orden.update({
        where: { id: data.ordenId },
        data:  { estado: "COMPLETADO" },
      });

      return val;
    });
    return mapValoracion(v);
  },

  async responder(valoracionId: string, vendedorId: string, respuesta: string, prisma: PrismaClient) {
    const v = await prisma.valoracion.findUniqueOrThrow({
      where:   { id: valoracionId },
      include: valoracionInclude,
    });

    await prisma.respuestaValoracion.upsert({
      where:  { valoracionId },
      update: { respuesta },
      create: { valoracionId, vendedorId, respuesta },
    });

    const updated = await prisma.valoracion.findUniqueOrThrow({
      where:   { id: valoracionId },
      include: valoracionInclude,
    });
    return mapValoracion(updated);
  },
};
