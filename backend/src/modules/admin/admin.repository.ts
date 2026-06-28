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

  /**
   * Reporte de PRODUCTOS & INVENTARIO: unidades/ingresos por producto (vs periodo
   * anterior), salud del stock (snapshot actual), SKUs sin ventas y ventas por
   * categoría raíz. Granularidad a nivel de ítem de orden (items_orden).
   */
  async analiticaProductos(dias: number, prisma: PrismaClient) {
    const desde     = rangoDesde(dias);
    const desdePrev = rangoDesde(dias * 2);

    const [kpiRows, invRows, sinVentasRows, activosRows, topProductos, porCategoria] = await Promise.all([
      prisma.$queryRaw<Array<{ uni_cur: number; uni_prev: number; ing_cur: number; ing_prev: number }>>`
        SELECT
          COALESCE(SUM(i.cantidad) FILTER (WHERE o.creado_en >= ${desde}), 0)::int                                       AS uni_cur,
          COALESCE(SUM(i.cantidad) FILTER (WHERE o.creado_en >= ${desdePrev} AND o.creado_en < ${desde}), 0)::int        AS uni_prev,
          COALESCE(SUM(i.subtotal) FILTER (WHERE o.creado_en >= ${desde}), 0)::float8                                    AS ing_cur,
          COALESCE(SUM(i.subtotal) FILTER (WHERE o.creado_en >= ${desdePrev} AND o.creado_en < ${desde}), 0)::float8     AS ing_prev
        FROM items_orden i JOIN ordenes o ON o.id = i.orden_id
        WHERE o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desdePrev}
      `,
      prisma.$queryRaw<Array<{ en_stock: number; bajo: number; agotado: number }>>`
        SELECT
          COUNT(*) FILTER (WHERE stock > 5)::int            AS en_stock,
          COUNT(*) FILTER (WHERE stock BETWEEN 1 AND 5)::int AS bajo,
          COUNT(*) FILTER (WHERE stock = 0)::int            AS agotado
        FROM productos WHERE activo = true
      `,
      prisma.$queryRaw<Array<{ n: number }>>`
        SELECT COUNT(*)::int AS n FROM productos pr
        WHERE pr.activo = true AND NOT EXISTS (
          SELECT 1 FROM items_orden i JOIN ordenes o ON o.id = i.orden_id
          WHERE i.producto_id = pr.id AND o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desde}
        )
      `,
      prisma.$queryRaw<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM productos WHERE activo = true`,
      prisma.$queryRaw<Array<{ nombre: string; vendedor: string; unidades: number; ingresos: string }>>`
        SELECT pr.nombre, v.nombre_negocio AS vendedor, SUM(i.cantidad)::int AS unidades, COALESCE(SUM(i.subtotal), 0)::text AS ingresos
        FROM items_orden i
        JOIN ordenes o ON o.id = i.orden_id
        JOIN productos pr ON pr.id = i.producto_id
        JOIN perfiles_vendedor v ON v.id = pr.vendedor_id
        WHERE o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desde}
        GROUP BY pr.id, pr.nombre, v.nombre_negocio
        ORDER BY SUM(i.subtotal) DESC LIMIT 10
      `,
      prisma.$queryRaw<Array<{ etiqueta: string; valor: number; monto: string }>>`
        SELECT COALESCE(p.nombre, c.nombre) AS etiqueta, SUM(i.cantidad)::int AS valor, COALESCE(SUM(i.subtotal), 0)::text AS monto
        FROM items_orden i
        JOIN ordenes o ON o.id = i.orden_id
        JOIN productos pr ON pr.id = i.producto_id
        JOIN categorias c ON c.id = pr.categoria_id
        LEFT JOIN categorias p ON p.id = c.padre_id
        WHERE o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desde}
        GROUP BY 1 ORDER BY 3 DESC
      `,
    ]);

    return {
      kpi: kpiRows[0] ?? { uni_cur: 0, uni_prev: 0, ing_cur: 0, ing_prev: 0 },
      inv: invRows[0] ?? { en_stock: 0, bajo: 0, agotado: 0 },
      sinVentas: sinVentasRows[0]?.n ?? 0,
      productosActivos: activosRows[0]?.n ?? 0,
      topProductos, porCategoria,
    };
  },

  /**
   * Reporte de CLIENTES & RETENCIÓN: clientes activos y ticket (vs periodo previo),
   * nuevos vs recurrentes, distribución por frecuencia de compra y top clientes por
   * gasto (LTV). Base para entender la fidelización de la base de compradores.
   */
  async analiticaClientes(dias: number, prisma: PrismaClient) {
    const desde     = rangoDesde(dias);
    const desdePrev = rangoDesde(dias * 2);

    const [actRows, freqRows, nuevosRows, topClientes] = await Promise.all([
      prisma.$queryRaw<Array<{
        act_cur: number; act_prev: number; gasto_cur: number; gasto_prev: number; ord_cur: number; ord_prev: number;
      }>>`
        SELECT
          COUNT(DISTINCT comprador_id) FILTER (WHERE creado_en >= ${desde})::int                                     AS act_cur,
          COUNT(DISTINCT comprador_id) FILTER (WHERE creado_en >= ${desdePrev} AND creado_en < ${desde})::int        AS act_prev,
          COALESCE(SUM(total) FILTER (WHERE creado_en >= ${desde}), 0)::float8                                       AS gasto_cur,
          COALESCE(SUM(total) FILTER (WHERE creado_en >= ${desdePrev} AND creado_en < ${desde}), 0)::float8          AS gasto_prev,
          COUNT(*) FILTER (WHERE creado_en >= ${desde})::int                                                         AS ord_cur,
          COUNT(*) FILTER (WHERE creado_en >= ${desdePrev} AND creado_en < ${desde})::int                            AS ord_prev
        FROM ordenes WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND creado_en >= ${desdePrev}
      `,
      prisma.$queryRaw<Array<{ f1: number; f2: number; f3: number; f4: number }>>`
        SELECT
          COUNT(*) FILTER (WHERE n = 1)::int            AS f1,
          COUNT(*) FILTER (WHERE n BETWEEN 2 AND 3)::int AS f2,
          COUNT(*) FILTER (WHERE n BETWEEN 4 AND 5)::int AS f3,
          COUNT(*) FILTER (WHERE n >= 6)::int            AS f4
        FROM (
          SELECT comprador_id, COUNT(*)::int AS n FROM ordenes
          WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND creado_en >= ${desde}
          GROUP BY comprador_id
        ) t
      `,
      prisma.$queryRaw<Array<{ nuevos: number; recurrentes: number }>>`
        SELECT
          COUNT(*) FILTER (WHERE primera >= ${desde})::int AS nuevos,
          COUNT(*) FILTER (WHERE primera <  ${desde})::int AS recurrentes
        FROM (
          SELECT comprador_id, MIN(creado_en) AS primera FROM ordenes
          WHERE estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO')
          GROUP BY comprador_id HAVING MAX(creado_en) >= ${desde}
        ) t
      `,
      prisma.$queryRaw<Array<{ nombre: string; ordenes: number; gasto: string; ticket: string }>>`
        SELECT pc.nombre_completo AS nombre, COUNT(*)::int AS ordenes,
          COALESCE(SUM(o.total), 0)::text AS gasto,
          (COALESCE(SUM(o.total), 0) / COUNT(*))::text AS ticket
        FROM ordenes o JOIN perfiles_comprador pc ON pc.id = o.comprador_id
        WHERE o.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO') AND o.creado_en >= ${desde}
        GROUP BY pc.id, pc.nombre_completo
        ORDER BY SUM(o.total) DESC LIMIT 10
      `,
    ]);

    return {
      act:    actRows[0]    ?? { act_cur: 0, act_prev: 0, gasto_cur: 0, gasto_prev: 0, ord_cur: 0, ord_prev: 0 },
      freq:   freqRows[0]   ?? { f1: 0, f2: 0, f3: 0, f4: 0 },
      nuevos: nuevosRows[0] ?? { nuevos: 0, recurrentes: 0 },
      topClientes,
    };
  },

  /** Audit log de seguridad (append-only), opcionalmente filtrado por tipo. */
  async eventosSeguridad(tipo: string | null, limite: number, prisma: PrismaClient) {
    return prisma.eventoSeguridad.findMany({
      where:   tipo ? { tipo } : undefined,
      orderBy: { creadoEn: "desc" },
      take:    Math.min(Math.max(limite, 1), 200),
    });
  },

  /** Señales de riesgo por vendedor con actividad (subconsultas → sin productos cartesianos). */
  async senalesRiesgoVendedores(prisma: PrismaClient) {
    return prisma.$queryRaw<Array<{
      id: string; nombre: string; verificado: boolean;
      total: number; cancelados: number; disputas: number; disputas_perdidas: number;
    }>>`
      SELECT v.id, v.nombre_negocio AS nombre, v.verificado,
        (SELECT COUNT(*) FROM ordenes o WHERE o.vendedor_id = v.id)::int                                           AS total,
        (SELECT COUNT(*) FROM ordenes o WHERE o.vendedor_id = v.id AND o.estado = 'CANCELADO')::int                AS cancelados,
        (SELECT COUNT(*) FROM disputas d WHERE d.vendedor_id = v.id)::int                                          AS disputas,
        (SELECT COUNT(*) FROM disputas d WHERE d.vendedor_id = v.id AND d.estado = 'RESUELTA_COMPRADOR')::int      AS disputas_perdidas
      FROM perfiles_vendedor v
      WHERE EXISTS (SELECT 1 FROM ordenes o WHERE o.vendedor_id = v.id)
    `;
  },

};
