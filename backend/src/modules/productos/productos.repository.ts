import type { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";

// Include con la oferta ACTIVA vigente de cada producto embebida como relación
// filtrada. Prisma la resuelve en una sola consulta batcheada (no N+1) junto al
// listado. `ahora` se calcula por invocación (las ofertas usan fechas absolutas).
function buildInclude() {
  const ahora = new Date();
  return {
    categoria: true,
    vendedor:  true,
    imagenes:  { orderBy: { orden: "asc" as const } },
    etiquetas: { include: { etiqueta: true } },
    ofertaProductos: {
      where:  { oferta: { estado: "ACTIVA" as const, fechaInicio: { lte: ahora }, fechaFin: { gte: ahora } } },
      select: { oferta: { select: { descuento: true, fechaFin: true } } },
    },
  };
}

type ProductoConRelaciones = {
  precio: Decimal;
  etiquetas: { etiqueta: { id: string; nombre: string; slug: string } }[];
  ofertaProductos?: { oferta: { descuento: { toString: () => string }; fechaFin: Date } }[];
};

function mapProducto<T extends ProductoConRelaciones>(p: T) {
  const { ofertaProductos, ...rest } = p;
  // Mejor oferta vigente = mayor descuento entre las ofertas activas del producto.
  let descuentoOferta: string | null = null;
  let precioOferta:    string | null = null;
  let ofertaFin:       string | null = null;
  if (ofertaProductos && ofertaProductos.length > 0) {
    let mejor = ofertaProductos[0].oferta;
    for (const op of ofertaProductos) {
      if (new Decimal(op.oferta.descuento.toString()).gt(new Decimal(mejor.descuento.toString()))) {
        mejor = op.oferta;
      }
    }
    const desc = new Decimal(mejor.descuento.toString());
    descuentoOferta = desc.toString();
    precioOferta = new Decimal(p.precio.toString())
      .mul(new Decimal(100).minus(desc)).div(100)
      .toDecimalPlaces(2).toString();
    ofertaFin = mejor.fechaFin.toISOString();
  }
  return {
    ...rest,
    etiquetas: p.etiquetas.map((pe) => pe.etiqueta),
    descuentoOferta,
    precioOferta,
    ofertaFin,
  };
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
        include: buildInclude(),
      });
      return p;
    });
    return mapProducto(producto);
  },

  async findById(id: string, prisma: PrismaClient) {
    const p = await prisma.producto.findUnique({ where: { id }, include: buildInclude() });
    return p ? mapProducto(p) : null;
  },

  async findByIds(ids: string[], prisma: PrismaClient) {
    if (ids.length === 0) return [];
    const rows = await prisma.producto.findMany({ where: { id: { in: ids } }, include: buildInclude() });
    const byId = new Map(rows.map((r) => [r.id, mapProducto(r)]));
    // Preserva el orden de `ids` (relevancia), que findMany no garantiza
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  },

  async findByVendedor(vendedorId: string, prisma: PrismaClient) {
    const rows = await prisma.producto.findMany({
      where:   { vendedorId },
      include: buildInclude(),
      orderBy: { creadoEn: "desc" },
    });
    return rows.map(mapProducto);
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
      // Tri-estado: false=solo inactivos · null=todos · true/undefined=solo activos (default seguro).
      // Público pasa true (o nada → activos); el admin usa null (todos) o false (inactivos).
      ...(soloActivos === false ? { activo: false } : soloActivos === null ? {} : { activo: true }),
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
      : orden === "MAS_VENDIDOS"  ? [{ totalVendido: "desc" }, { destacado: "desc" }]
      : [{ destacado: "desc" }, { creadoEn: "desc" }]; // RECIENTES (default)

    const [total, rows] = await prisma.$transaction([
      prisma.producto.count({ where }),
      prisma.producto.findMany({
        where,
        include: buildInclude(),
        orderBy,
        skip:    (pagina - 1) * limite,
        take:    limite,
      }),
    ]);
    return { total, items: rows.map(mapProducto) };
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
      return tx.producto.update({ where: { id }, data: campos, include: buildInclude() });
    });
    return mapProducto(p);
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
      include: buildInclude(),
    });
    return mapProducto(updated);
  },

  async addImagenes(productoId: string, urls: string[], prisma: PrismaClient) {
    const maxOrden = await prisma.imagenProducto.count({ where: { productoId } });
    await prisma.imagenProducto.createMany({
      data: urls.map((url, i) => ({ productoId, url, orden: maxOrden + i })),
    });
    const p = await prisma.producto.findUniqueOrThrow({ where: { id: productoId }, include: buildInclude() });
    return mapProducto(p);
  },

  async removeImagen(imagenId: string, prisma: PrismaClient) {
    await prisma.imagenProducto.delete({ where: { id: imagenId } });
    return true;
  },
};
