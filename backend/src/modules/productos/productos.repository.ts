import type { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";

const include = {
  categoria: true,
  vendedor:  true,
  imagenes:  { orderBy: { orden: "asc" as const } },
  etiquetas: { include: { etiqueta: true } },
};

function mapEtiquetas<T extends { etiquetas: { etiqueta: { id: string; nombre: string; slug: string } }[] }>(p: T) {
  return { ...p, etiquetas: p.etiquetas.map((pe) => pe.etiqueta) };
}

export const productosRepository = {
  async create(
    data: {
      vendedorId:  string;
      categoriaId: string;
      nombre:      string;
      descripcion?: string | null;
      precio:      Decimal;
      stock:       number;
      etiquetaIds: string[];
      imagenesUrl: string[];
    },
    prisma: PrismaClient,
  ) {
    const { etiquetaIds, imagenesUrl, ...campos } = data;
    const producto = await prisma.$transaction(async (tx) => {
      const p = await tx.producto.create({
        data: {
          ...campos,
          etiquetas: {
            create: etiquetaIds.map((etiquetaId) => ({ etiquetaId })),
          },
          imagenes: {
            create: imagenesUrl.map((url, orden) => ({ url, orden })),
          },
        },
        include,
      });
      return p;
    });
    return mapEtiquetas(producto);
  },

  async findById(id: string, prisma: PrismaClient) {
    const p = await prisma.producto.findUnique({ where: { id }, include });
    return p ? mapEtiquetas(p) : null;
  },

  async findByIds(ids: string[], prisma: PrismaClient) {
    if (ids.length === 0) return [];
    const rows = await prisma.producto.findMany({ where: { id: { in: ids } }, include });
    const byId = new Map(rows.map((r) => [r.id, mapEtiquetas(r)]));
    // Preserva el orden de `ids` (relevancia), que findMany no garantiza
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    const rows = await prisma.producto.findMany({
      where:   { vendedorId },
      include,
      orderBy: { creadoEn: "desc" },
    });
    return rows.map(mapEtiquetas);
  },

  async findPaginated(
    { pagina, limite, categoriaId, vendedorId, soloActivos, orden, precioMin, precioMax, ciudad }:
      {
        pagina: number; limite: number; categoriaId?: string | null; vendedorId?: string | null; soloActivos?: boolean | null;
        orden?: string | null; precioMin?: number | null; precioMax?: number | null; ciudad?: string | null;
      },
    prisma: PrismaClient,
  ) {
    // Filtro de rango de precio aplicado en SQL (no en memoria)
    const precioFilter =
      precioMin != null || precioMax != null
        ? {
            precio: {
              ...(precioMin != null ? { gte: precioMin } : {}),
              ...(precioMax != null ? { lte: precioMax } : {}),
            },
          }
        : {};

    const where = {
      ...(soloActivos !== false ? { activo: true } : {}),
      ...(categoriaId ? { categoriaId } : {}),
      ...(vendedorId ? { vendedorId } : {}),
      ...(ciudad ? { vendedor: { is: { ciudad } } } : {}),
      ...precioFilter,
    };

    // Orden traducido a ORDER BY de Postgres. "MEJOR_VALORADOS" ordena por el
    // rating del vendedor (relación) — Prisma lo resuelve con un JOIN, no N+1.
    const orderBy: Record<string, unknown>[] =
      orden === "PRECIO_ASC"      ? [{ precio: "asc" }]
      : orden === "PRECIO_DESC"   ? [{ precio: "desc" }]
      : orden === "MEJOR_VALORADOS" ? [{ vendedor: { ratingPromedio: "desc" } }, { creadoEn: "desc" }]
      : [{ destacado: "desc" }, { creadoEn: "desc" }]; // RECIENTES (default)

    const [total, rows] = await prisma.$transaction([
      prisma.producto.count({ where }),
      prisma.producto.findMany({
        where,
        include,
        orderBy,
        skip:    (pagina - 1) * limite,
        take:    limite,
      }),
    ]);
    return { total, items: rows.map(mapEtiquetas) };
  },

  async update(
    id: string,
    data: {
      nombre?:      string;
      descripcion?: string | null;
      precio?:      Decimal;
      stock?:       number;
      categoriaId?: string;
      etiquetaIds?: string[];
    },
    prisma: PrismaClient,
  ) {
    const { etiquetaIds, ...campos } = data;
    const p = await prisma.$transaction(async (tx) => {
      if (etiquetaIds !== undefined) {
        await tx.productoEtiqueta.deleteMany({ where: { productoId: id } });
        if (etiquetaIds.length > 0) {
          await tx.productoEtiqueta.createMany({
            data: etiquetaIds.map((etiquetaId) => ({ productoId: id, etiquetaId })),
          });
        }
      }
      return tx.producto.update({ where: { id }, data: campos, include });
    });
    return mapEtiquetas(p);
  },

  async softDelete(id: string, prisma: PrismaClient) {
    await prisma.producto.update({ where: { id }, data: { activo: false } });
    return true;
  },

  async toggleDestacado(id: string, prisma: PrismaClient) {
    const p = await prisma.producto.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.producto.update({
      where: { id },
      data:  { destacado: !p.destacado },
      include,
    });
    return mapEtiquetas(updated);
  },

  async addImagenes(productoId: string, urls: string[], prisma: PrismaClient) {
    const maxOrden = await prisma.imagenProducto.count({ where: { productoId } });
    await prisma.imagenProducto.createMany({
      data: urls.map((url, i) => ({ productoId, url, orden: maxOrden + i })),
    });
    const p = await prisma.producto.findUniqueOrThrow({ where: { id: productoId }, include });
    return mapEtiquetas(p);
  },

  async removeImagen(imagenId: string, prisma: PrismaClient) {
    await prisma.imagenProducto.delete({ where: { id: imagenId } });
    return true;
  },
};
