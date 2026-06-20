import type { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";

const itemInclude = {
  producto: {
    include: {
      categoria: true,
      vendedor:  true,
      imagenes:  { orderBy: { orden: "asc" as const } },
      etiquetas: { include: { etiqueta: true } },
    },
  },
};

function mapItem(item: {
  id: string;
  cantidad: number;
  precioSnapshot: { toString: () => string };
  producto: { etiquetas: { etiqueta: { id: string; nombre: string; slug: string } }[] } & object;
}) {
  const precio   = new Decimal(item.precioSnapshot.toString());
  const subtotal = precio.mul(item.cantidad).toString();
  return {
    ...item,
    precioSnapshot: precio.toString(),
    subtotal,
    producto: {
      ...(item.producto as object),
      etiquetas: (item.producto as { etiquetas: { etiqueta: object }[] }).etiquetas.map(
        (pe) => pe.etiqueta,
      ),
    },
  };
}

function mapCarrito(carrito: {
  id: string;
  items: Parameters<typeof mapItem>[0][];
}) {
  const items = carrito.items.map(mapItem);
  const total = items
    .reduce((acc, it) => acc.plus(it.subtotal), new Decimal(0))
    .toString();
  return {
    id: carrito.id,
    items,
    total,
    totalItems: items.reduce((acc, it) => acc + it.cantidad, 0),
  };
}

export const carritoRepository = {
  async getOrCreate(compradorId: string, prisma: PrismaClient) {
    const carrito = await prisma.carrito.upsert({
      where:   { compradorId },
      create:  { compradorId },
      update:  {},
      include: { items: { include: itemInclude, orderBy: { agregadoEn: "asc" } } },
    });
    return mapCarrito(carrito);
  },

  async findByCompradorId(compradorId: string, prisma: PrismaClient) {
    const carrito = await prisma.carrito.findUnique({
      where:   { compradorId },
      include: { items: { include: itemInclude, orderBy: { agregadoEn: "asc" } } },
    });
    return carrito ? mapCarrito(carrito) : null;
  },

  async upsertItem(
    carritoId: string,
    productoId: string,
    cantidad: number,
    precioSnapshot: Decimal,
    prisma: PrismaClient,
  ) {
    await prisma.itemCarrito.upsert({
      where:  { carritoId_productoId: { carritoId, productoId } },
      create: { carritoId, productoId, cantidad, precioSnapshot },
      update: { cantidad, precioSnapshot },
    });
  },

  async incrementItem(carritoId: string, productoId: string, cantidad: number, prisma: PrismaClient) {
    await prisma.itemCarrito.update({
      where: { carritoId_productoId: { carritoId, productoId } },
      data:  { cantidad },
    });
  },

  async deleteItem(carritoId: string, productoId: string, prisma: PrismaClient) {
    await prisma.itemCarrito.deleteMany({ where: { carritoId, productoId } });
  },

  async clearItems(carritoId: string, prisma: PrismaClient) {
    await prisma.itemCarrito.deleteMany({ where: { carritoId } });
  },

  async getCarritoId(compradorId: string, prisma: PrismaClient): Promise<string> {
    const c = await prisma.carrito.upsert({
      where:  { compradorId },
      create: { compradorId },
      update: {},
    });
    return c.id;
  },

  // ── Guardar para después ──────────────────────────────────────────────────
  async guardar(compradorId: string, productoId: string, prisma: PrismaClient) {
    await prisma.itemGuardado.upsert({
      where:  { compradorId_productoId: { compradorId, productoId } },
      create: { compradorId, productoId },
      update: {},
    });
  },

  async eliminarGuardado(compradorId: string, productoId: string, prisma: PrismaClient) {
    await prisma.itemGuardado.deleteMany({ where: { compradorId, productoId } });
  },

  async listarGuardados(compradorId: string, prisma: PrismaClient) {
    const rows = await prisma.itemGuardado.findMany({
      where:   { compradorId },
      orderBy: { creadoEn: "desc" },
      select: {
        producto: {
          select: {
            id: true, nombre: true, precio: true, stock: true, activo: true,
            imagenes: { orderBy: { orden: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id:        r.producto.id,
      nombre:    r.producto.nombre,
      precio:    r.producto.precio.toString(),
      stock:     r.producto.stock,
      activo:    r.producto.activo,
      imagenUrl: r.producto.imagenes[0]?.url ?? null,
    }));
  },
};
