import type { PrismaClient } from "@prisma/client";

function mapCupon(c: {
  id: string;
  codigo: string;
  tipo: string;
  valor: { toString: () => string };
  montoMinimo: { toString: () => string } | null;
  maxUsos: number | null;
  usosActuales: number;
  vendedorId: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  activo: boolean;
  creadoEn: Date;
}) {
  return {
    id:           c.id,
    codigo:       c.codigo,
    tipo:         c.tipo,
    valor:        c.valor.toString(),
    montoMinimo:  c.montoMinimo?.toString() ?? null,
    maxUsos:      c.maxUsos,
    usosActuales: c.usosActuales,
    vendedorId:   c.vendedorId,
    fechaInicio:  c.fechaInicio.toISOString(),
    fechaFin:     c.fechaFin.toISOString(),
    activo:       c.activo,
    creadoEn:     c.creadoEn.toISOString(),
  };
}

export const cuponesRepository = {
  async findAll(prisma: PrismaClient) {
    const cupones = await prisma.cupon.findMany({ orderBy: { creadoEn: "desc" } });
    return cupones.map(mapCupon);
  },

  async findByCodigo(codigo: string, prisma: PrismaClient) {
    return prisma.cupon.findUnique({ where: { codigo } });
  },

  async findById(id: string, prisma: PrismaClient) {
    return prisma.cupon.findUnique({ where: { id } });
  },

  async setActivo(id: string, activo: boolean, prisma: PrismaClient) {
    const cupon = await prisma.cupon.update({ where: { id }, data: { activo } });
    return mapCupon(cupon);
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    const cupones = await prisma.cupon.findMany({
      where:   { vendedorId },
      orderBy: { creadoEn: "desc" },
    });
    return cupones.map(mapCupon);
  },

  async countUsosPorUsuario(cuponId: string, usuarioId: string, prisma: PrismaClient) {
    return prisma.usoCupon.count({ where: { cuponId, usuarioId } });
  },

  async create(
    data: {
      codigo: string;
      tipo: string;
      valor: number;
      montoMinimo?: number | null;
      maxUsos?: number | null;
      vendedorId?: string | null;
      fechaInicio: Date;
      fechaFin: Date;
    },
    prisma: PrismaClient,
  ) {
    const cupon = await prisma.cupon.create({
      data: {
        codigo:      data.codigo,
        tipo:        data.tipo,
        valor:       data.valor,
        montoMinimo: data.montoMinimo ?? undefined,
        maxUsos:     data.maxUsos ?? undefined,
        vendedorId:  data.vendedorId ?? undefined,
        fechaInicio: data.fechaInicio,
        fechaFin:    data.fechaFin,
      },
    });
    return mapCupon(cupon);
  },
};
