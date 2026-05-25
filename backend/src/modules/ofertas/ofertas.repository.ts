import type { PrismaClient, EstadoOferta } from "@prisma/client";

const ofertaInclude = {
  productos: {
    include: {
      producto: { select: { id: true, nombre: true, precio: true } },
    },
  },
} as const;

function mapOferta(oferta: {
  id: string;
  titulo: string;
  descripcion: string | null;
  descuento: { toString: () => string };
  fechaInicio: Date;
  fechaFin: Date;
  estado: EstadoOferta;
  creadoEn: Date;
  productos: { producto: { id: string; nombre: string; precio: { toString: () => string } } }[];
}) {
  return {
    id:          oferta.id,
    titulo:      oferta.titulo,
    descripcion: oferta.descripcion,
    descuento:   oferta.descuento.toString(),
    fechaInicio: oferta.fechaInicio.toISOString(),
    fechaFin:    oferta.fechaFin.toISOString(),
    estado:      oferta.estado,
    creadoEn:    oferta.creadoEn.toISOString(),
    productos:   oferta.productos.map((op) => ({
      id:     op.producto.id,
      nombre: op.producto.nombre,
      precio: op.producto.precio.toString(),
    })),
  };
}

export const ofertasRepository = {
  async findActivas(prisma: PrismaClient) {
    const ahora = new Date();
    const ofertas = await prisma.oferta.findMany({
      where: { estado: "ACTIVA", fechaFin: { gte: ahora } },
      include: ofertaInclude,
      orderBy: { creadoEn: "desc" },
    });
    return ofertas.map(mapOferta);
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    const ofertas = await prisma.oferta.findMany({
      where:   { vendedorId },
      include: ofertaInclude,
      orderBy: { creadoEn: "desc" },
    });
    return ofertas.map(mapOferta);
  },

  async findById(id: string, prisma: PrismaClient) {
    const oferta = await prisma.oferta.findUnique({ where: { id }, include: ofertaInclude });
    return oferta ? mapOferta(oferta) : null;
  },

  async create(
    vendedorId: string,
    data: { titulo: string; descripcion?: string | null; descuento: number; fechaInicio: Date; fechaFin: Date },
    productoIds: string[],
    prisma: PrismaClient,
  ) {
    const estado: EstadoOferta = data.fechaInicio <= new Date() ? "ACTIVA" : "PROGRAMADA";
    const oferta = await prisma.oferta.create({
      data: {
        vendedorId,
        titulo:      data.titulo,
        descripcion: data.descripcion,
        descuento:   data.descuento,
        fechaInicio: data.fechaInicio,
        fechaFin:    data.fechaFin,
        estado,
        productos: { create: productoIds.map((productoId) => ({ productoId })) },
      },
      include: ofertaInclude,
    });
    return mapOferta(oferta);
  },

  async update(
    id: string,
    data: { titulo?: string; descripcion?: string | null; descuento?: number; fechaFin?: Date },
    productoIds: string[] | undefined,
    prisma: PrismaClient,
  ) {
    await prisma.oferta.update({
      where: { id },
      data:  {
        ...(data.titulo      !== undefined && { titulo: data.titulo }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.descuento   !== undefined && { descuento: data.descuento }),
        ...(data.fechaFin    !== undefined && { fechaFin: data.fechaFin }),
        ...(productoIds !== undefined && {
          productos: {
            deleteMany: {},
            create: productoIds.map((productoId) => ({ productoId })),
          },
        }),
      },
    });
    const updated = await prisma.oferta.findUniqueOrThrow({ where: { id }, include: ofertaInclude });
    return mapOferta(updated);
  },

  async updateEstado(id: string, estado: EstadoOferta, prisma: PrismaClient) {
    const oferta = await prisma.oferta.update({
      where:   { id },
      data:    { estado },
      include: ofertaInclude,
    });
    return mapOferta(oferta);
  },

  async actualizarEstadosAutomaticos(prisma: PrismaClient) {
    const ahora = new Date();
    await prisma.oferta.updateMany({
      where: { estado: "ACTIVA", fechaFin: { lt: ahora } },
      data:  { estado: "VENCIDA" },
    });
    await prisma.oferta.updateMany({
      where: { estado: "PROGRAMADA", fechaInicio: { lte: ahora }, fechaFin: { gte: ahora } },
      data:  { estado: "ACTIVA" },
    });
  },
};
