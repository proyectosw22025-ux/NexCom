import type { PrismaClient } from "@prisma/client";
import { rangoDesde, rellenarSerieDiaria } from "../../shared/series-diaria.util.js";

// Días tras el ENVÍO sin confirmar (ni disputa) para auto-liberar los fondos al vendedor.
export const DIAS_AUTO_LIBERACION = 7;

const ordenInclude = {
  items:            true,
  pago:             true,
  historialEstados: { orderBy: { creadoEn: "asc" as const } },
} as const;

const ordenVendedorInclude = {
  items: true,
  pago:  true,
  historialEstados: { orderBy: { creadoEn: "asc" as const } },
  comprador: {
    select: { id: true, nombreCompleto: true, telefono: true },
  },
} as const;

function mapOrden(o: ReturnType<typeof rawOrden>) {
  return {
    ...o,
    subtotal:       o.subtotal.toString(),
    descuentoCupon: o.descuentoCupon.toString(),
    costoEnvio:     o.costoEnvio.toString(),
    total:          o.total.toString(),
    creadoEn:       o.creadoEn.toISOString(),
    actualizadoEn:  o.actualizadoEn.toISOString(),
    items: o.items.map((it) => ({
      ...it,
      precioUnitario: it.precioUnitario.toString(),
      subtotal:       it.subtotal.toString(),
    })),
    pago: o.pago
      ? { ...o.pago, monto: o.pago.monto.toString(), creadoEn: o.pago.creadoEn.toISOString() }
      : null,
    historialEstados: o.historialEstados.map((h) => ({
      ...h,
      creadoEn: h.creadoEn.toISOString(),
    })),
    direccionSnapshot: o.direccionSnapshot as Record<string, unknown> | null,
    autoLiberaEn:      o.autoLiberaEn ? o.autoLiberaEn.toISOString() : null,
    fondosLiberadosEn: o.fondosLiberadosEn ? o.fondosLiberadosEn.toISOString() : null,
  };
}

// Utility type helper
function rawOrden(o: {
  id: string; compradorId: string; vendedorId: string; estado: string;
  subtotal: { toString(): string }; descuentoCupon: { toString(): string };
  costoEnvio: { toString(): string }; metodoEntrega: string; puntoRetiro: string | null;
  total: { toString(): string }; notas: string | null;
  stripePaymentIntentId: string | null; direccionSnapshot: unknown;
  codigoEntrega: string | null; autoLiberaEn: Date | null; fondosLiberadosEn: Date | null;
  creadoEn: Date; actualizadoEn: Date;
  items: Array<{ id: string; productoId: string; nombreSnapshot: string; cantidad: number; precioUnitario: { toString(): string }; subtotal: { toString(): string } }>;
  pago: { id: string; monto: { toString(): string }; moneda: string; metodo: string; estado: string; creadoEn: Date } | null;
  historialEstados: Array<{ id: string; estadoAnterior: string | null; estadoNuevo: string; notas: string | null; creadoEn: Date }>;
}) { return o; }

export const ordenesRepository = {
  async findByComprador(compradorId: string, prisma: PrismaClient) {
    const ordenes = await prisma.orden.findMany({
      where:   { compradorId },
      include: ordenInclude,
      orderBy: { creadoEn: "desc" },
    });
    return ordenes.map(mapOrden);
  },

  async findOneByComprador(id: string, compradorId: string, prisma: PrismaClient) {
    const o = await prisma.orden.findFirst({
      where:   { id, compradorId },
      include: ordenInclude,
    });
    return o ? mapOrden(o) : null;
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    const ordenes = await prisma.orden.findMany({
      where:   { vendedorId },
      include: ordenVendedorInclude,
      orderBy: { creadoEn: "desc" },
    });
    return ordenes.map((o) => ({
      ...mapOrden(o),
      comprador: o.comprador ?? null,
    }));
  },

  async findOneByVendedor(id: string, vendedorId: string, prisma: PrismaClient) {
    const o = await prisma.orden.findFirst({
      where:   { id, vendedorId },
      include: ordenVendedorInclude,
    });
    if (!o) return null;
    return { ...mapOrden(o), comprador: o.comprador ?? null };
  },

  async avanzarEstado(
    id: string,
    estadoNuevo: string,
    usuarioId: string,
    notas: string | null | undefined,
    comprobanteUrl: string | null | undefined,
    prisma: PrismaClient,
  ) {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.orden.update({
        where:   { id },
        data:    {
          estado: estadoNuevo as never,
          ...(comprobanteUrl ? { comprobanteUrl } : {}),
          // Al ENVIAR arranca la ventana de auto-liberación de la garantía.
          ...(estadoNuevo === "ENVIADO"
            ? { autoLiberaEn: new Date(Date.now() + DIAS_AUTO_LIBERACION * 86_400_000) }
            : {}),
        },
        include: ordenVendedorInclude,
      });
      await tx.historialEstadoOrden.create({
        data: {
          ordenId:       id,
          estadoAnterior: orden.estado as never,
          estadoNuevo:   estadoNuevo as never,
          cambiadoPorId: usuarioId,
          notas:         notas ?? null,
        },
      });
      return o;
    });
    return { ...mapOrden(updated), comprador: updated.comprador ?? null };
  },

  /**
   * Serie de ventas por día (últimos `dias` días) para el dashboard del vendedor.
   *
   * La agregación se hace 100% en PostgreSQL (`GROUP BY date_trunc`), no en
   * memoria: una sola query devuelve como máximo `dias` filas sin importar
   * cuántas órdenes existan — esto escala a millones de órdenes. Se apoya en el
   * índice `(estado, creado_en)` ya definido en el modelo Orden.
   *
   * Los huecos (días sin ventas) se rellenan en JS para que el gráfico dibuje
   * una serie continua, manteniendo el cálculo pesado en la base de datos.
   */
  async ventasPorDia(vendedorId: string, dias: number, prisma: PrismaClient) {
    const desde = rangoDesde(dias);

    const rows = await prisma.$queryRaw<Array<{ fecha: string; ordenes: number; total: string }>>`
      SELECT
        to_char(date_trunc('day', creado_en), 'YYYY-MM-DD') AS fecha,
        COUNT(*)::int                                       AS ordenes,
        COALESCE(SUM(total), 0)::text                       AS total
      FROM ordenes
      WHERE vendedor_id = ${vendedorId}
        AND estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO')
        AND creado_en >= ${desde}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rellenarSerieDiaria(rows, dias);
  },

  async marcarEntregada(id: string, usuarioId: string, prisma: PrismaClient) {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.orden.update({
        where:   { id },
        data:    { estado: "ENTREGADO", fondosLiberadosEn: new Date() },
        include: ordenInclude,
      });
      await tx.historialEstadoOrden.create({
        data: {
          ordenId:        id,
          estadoAnterior: orden.estado as never,
          estadoNuevo:    "ENTREGADO",
          cambiadoPorId:  usuarioId,
        },
      });
      return o;
    });
    return mapOrden(updated);
  },
};
