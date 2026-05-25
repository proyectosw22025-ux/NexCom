import type { PrismaClient } from "@prisma/client";

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
  };
}

// Utility type helper
function rawOrden(o: {
  id: string; compradorId: string; vendedorId: string; estado: string;
  subtotal: { toString(): string }; descuentoCupon: { toString(): string };
  total: { toString(): string }; notas: string | null;
  stripePaymentIntentId: string | null; direccionSnapshot: unknown;
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
    prisma: PrismaClient,
  ) {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.orden.update({
        where:   { id },
        data:    { estado: estadoNuevo as never },
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

  async marcarEntregada(id: string, usuarioId: string, prisma: PrismaClient) {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.orden.update({
        where:   { id },
        data:    { estado: "ENTREGADO" },
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
