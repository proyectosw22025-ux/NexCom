import type { PrismaClient } from "@prisma/client";
import { rangoDesde, rellenarSerieDiaria } from "../../shared/series-diaria.util.js";

const USUARIO_INCLUDE = {
  perfilVendedor: {
    select: { id: true, nombreNegocio: true, ciudad: true, ratingPromedio: true, totalVentas: true, totalResenias: true, verificado: true },
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

  /**
   * Analítica avanzada de la plataforma: KPIs (periodo actual vs anterior para los
   * deltas), serie temporal, distribuciones (método de pago, estado, ciudad) y top
   * vendedores. Todo agregado en SQL (escala con el volumen, no con la app).
   */
  async analitica(dias: number, prisma: PrismaClient) {
    const desde     = rangoDesde(dias);
    const desdePrev = rangoDesde(dias * 2); // inicio del periodo anterior (mismo tamaño)

    const [kpiOrdRows, kpiUsrRows, serieRows, porMetodo, porEstado, porCiudad, topVend] = await Promise.all([
      // KPIs de órdenes/ingresos: actual y anterior en una sola pasada
      prisma.$queryRaw<Array<{ ing_cur: number; ing_prev: number; ord_cur: number; ord_prev: number }>>`
        SELECT
          COALESCE(SUM(total) FILTER (WHERE creado_en >= ${desde}), 0)::float8                                      AS ing_cur,
          COALESCE(SUM(total) FILTER (WHERE creado_en >= ${desdePrev} AND creado_en < ${desde}), 0)::float8          AS ing_prev,
          COUNT(*) FILTER (WHERE creado_en >= ${desde})::int                                                         AS ord_cur,
          COUNT(*) FILTER (WHERE creado_en >= ${desdePrev} AND creado_en < ${desde})::int                            AS ord_prev
        FROM ordenes
        WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND creado_en >= ${desdePrev}
      `,
      // Usuarios nuevos: actual vs anterior
      prisma.$queryRaw<Array<{ cur: number; prev: number }>>`
        SELECT
          COUNT(*) FILTER (WHERE creado_en >= ${desde})::int                                       AS cur,
          COUNT(*) FILTER (WHERE creado_en >= ${desdePrev} AND creado_en < ${desde})::int           AS prev
        FROM usuarios WHERE creado_en >= ${desdePrev}
      `,
      // Serie temporal diaria (ingresos + órdenes)
      prisma.$queryRaw<Array<{ fecha: string; ordenes: number; total: string }>>`
        SELECT to_char(date_trunc('day', creado_en), 'YYYY-MM-DD') AS fecha,
          COUNT(*)::int AS ordenes, COALESCE(SUM(total), 0)::text AS total
        FROM ordenes
        WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND creado_en >= ${desde}
        GROUP BY 1 ORDER BY 1 ASC
      `,
      // Distribución por método de pago
      prisma.$queryRaw<Array<{ etiqueta: string; valor: number; monto: string }>>`
        SELECT p.metodo AS etiqueta, COUNT(*)::int AS valor, COALESCE(SUM(o.total), 0)::text AS monto
        FROM ordenes o JOIN pagos p ON p.orden_id = o.id
        WHERE o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desde}
        GROUP BY 1 ORDER BY 2 DESC
      `,
      // Distribución por estado de orden (todas las del periodo)
      prisma.$queryRaw<Array<{ etiqueta: string; valor: number; monto: string }>>`
        SELECT estado AS etiqueta, COUNT(*)::int AS valor, COALESCE(SUM(total), 0)::text AS monto
        FROM ordenes WHERE creado_en >= ${desde} GROUP BY 1 ORDER BY 2 DESC
      `,
      // Top ciudades por ingresos (del snapshot de dirección)
      prisma.$queryRaw<Array<{ etiqueta: string; valor: number; monto: string }>>`
        SELECT COALESCE(NULLIF(direccion_snapshot->>'ciudad', ''), '—') AS etiqueta,
          COUNT(*)::int AS valor, COALESCE(SUM(total), 0)::text AS monto
        FROM ordenes
        WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND creado_en >= ${desde}
        GROUP BY 1 ORDER BY 3 DESC LIMIT 6
      `,
      // Top vendedores por ingresos
      prisma.$queryRaw<Array<{ nombreNegocio: string; ingresos: string; ventas: number; rating: string }>>`
        SELECT v.nombre_negocio AS "nombreNegocio", COALESCE(SUM(o.total), 0)::text AS ingresos,
          COUNT(*)::int AS ventas, v.rating_promedio::text AS rating
        FROM ordenes o JOIN perfiles_vendedor v ON v.id = o.vendedor_id
        WHERE o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desde}
        GROUP BY v.id, v.nombre_negocio, v.rating_promedio
        ORDER BY SUM(o.total) DESC LIMIT 8
      `,
    ]);

    return {
      kpiOrd: kpiOrdRows[0] ?? { ing_cur: 0, ing_prev: 0, ord_cur: 0, ord_prev: 0 },
      kpiUsr: kpiUsrRows[0] ?? { cur: 0, prev: 0 },
      serie:  rellenarSerieDiaria(serieRows, dias),
      porMetodo, porEstado, porCiudad, topVend,
    };
  },
};
