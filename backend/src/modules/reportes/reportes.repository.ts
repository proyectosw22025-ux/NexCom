import type { PrismaClient, EstadoReporte, TipoReporte } from "@prisma/client";

const REPORTE_INCLUDE = {
  reportador:  { select: { id: true, email: true } },
  resueltoPor: { select: { id: true, email: true } },
} as const;

export const reportesRepository = {
  async create(
    data: {
      reportadorId: string;
      tipo:         TipoReporte;
      referenciaId: string;
      motivo:       string;
      descripcion?: string;
    },
    prisma: PrismaClient,
  ) {
    return prisma.reporte.create({ data, include: REPORTE_INCLUDE });
  },

  async findAll(
    { estado, tipo }: { estado?: EstadoReporte; tipo?: TipoReporte },
    pagina: number,
    limite: number,
    prisma: PrismaClient,
  ) {
    const where = {
      ...(estado ? { estado } : {}),
      ...(tipo   ? { tipo }   : {}),
    };
    const [items, total] = await Promise.all([
      prisma.reporte.findMany({
        where,
        include:  REPORTE_INCLUDE,
        orderBy:  { creadoEn: "desc" },
        skip:     (pagina - 1) * limite,
        take:     limite,
      }),
      prisma.reporte.count({ where }),
    ]);
    return { items, total, pagina, totalPaginas: Math.ceil(total / limite) };
  },

  async findById(id: string, prisma: PrismaClient) {
    return prisma.reporte.findUnique({ where: { id }, include: REPORTE_INCLUDE });
  },

  async resolver(
    id: string,
    estado: EstadoReporte,
    resolucion: string,
    adminId: string,
    prisma: PrismaClient,
  ) {
    return prisma.reporte.update({
      where: { id },
      data:  { estado, resolucion, resueltoPorId: adminId, resueltoEn: new Date() },
      include: REPORTE_INCLUDE,
    });
  },
};
