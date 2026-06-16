import type { PrismaClient } from "@prisma/client";
import { rangoDesde, rellenarSerieDiaria } from "../../shared/series-diaria.util.js";

const USUARIO_INCLUDE = {
  perfilVendedor: {
    select: { id: true, nombreNegocio: true, ciudad: true, ratingPromedio: true, totalVentas: true, totalResenias: true },
  },
  perfilComprador: {
    select: { id: true, nombreCompleto: true, telefono: true },
  },
} as const;

export const adminRepository = {
  async findAllUsuarios(
    { rol, activo }: { rol?: string; activo?: boolean },
    pagina: number,
    limite: number,
    prisma: PrismaClient,
  ) {
    const where = {
      ...(rol ? { rol: rol as "ADMIN" | "VENDEDOR" | "COMPRADOR" } : {}),
      ...(activo !== undefined ? { activo } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        include: USUARIO_INCLUDE,
        orderBy: { creadoEn: "desc" },
        skip:  (pagina - 1) * limite,
        take:  limite,
      }),
      prisma.usuario.count({ where }),
    ]);
    return { items, total, pagina, totalPaginas: Math.ceil(total / limite) };
  },

  async findById(id: string, prisma: PrismaClient) {
    return prisma.usuario.findUnique({ where: { id }, include: USUARIO_INCLUDE });
  },

  async toggleActivo(id: string, prisma: PrismaClient) {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    return prisma.usuario.update({
      where: { id },
      data:  { activo: !usuario.activo },
      include: USUARIO_INCLUDE,
    });
  },

  async updateRol(id: string, rol: string, prisma: PrismaClient) {
    return prisma.usuario.update({
      where: { id },
      data:  { rol: rol as "ADMIN" | "VENDEDOR" | "COMPRADOR" },
      include: USUARIO_INCLUDE,
    });
  },

  /**
   * Estadísticas globales de la plataforma para el dashboard admin.
   * Ventas agregadas en SQL (toda la plataforma, sin filtro de vendedor) +
   * conteo de reportes abiertos, resueltos en paralelo con Promise.all.
   */
  async estadisticas(dias: number, prisma: PrismaClient) {
    const desde = rangoDesde(dias);

    const [rows, reportesPendientes] = await Promise.all([
      prisma.$queryRaw<Array<{ fecha: string; ordenes: number; total: string }>>`
        SELECT
          to_char(date_trunc('day', creado_en), 'YYYY-MM-DD') AS fecha,
          COUNT(*)::int                                       AS ordenes,
          COALESCE(SUM(total), 0)::text                       AS total
        FROM ordenes
        WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO')
          AND creado_en >= ${desde}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.reporte.count({ where: { estado: { in: ["PENDIENTE", "REVISANDO"] } } }),
    ]);

    const ventasPorDia = rellenarSerieDiaria(rows, dias);
    const ingresosPeriodo = ventasPorDia.reduce((acc, d) => acc + parseFloat(d.total), 0);
    const ordenesPeriodo  = ventasPorDia.reduce((acc, d) => acc + d.ordenes, 0);

    return {
      ventasPorDia,
      reportesPendientes,
      ingresosPeriodo: ingresosPeriodo.toFixed(2),
      ordenesPeriodo,
    };
  },
};
