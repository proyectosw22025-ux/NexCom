import type { PrismaClient } from "@prisma/client";

const productoInclude = {
  categoria: true,
  vendedor:  true,
  imagenes:  { orderBy: { orden: "asc" as const } },
  etiquetas: { include: { etiqueta: true } },
};

function mapEtiquetas(p: { etiquetas: { etiqueta: { id: string; nombre: string; slug: string } }[] }) {
  return { ...p, etiquetas: p.etiquetas.map((pe) => pe.etiqueta) };
}

function mapFav(f: { id: string; creadoEn: Date; producto: Parameters<typeof mapEtiquetas>[0] & object }) {
  return { id: f.id, creadoEn: f.creadoEn, producto: mapEtiquetas(f.producto) };
}

export const favoritosRepository = {
  async findAll(compradorId: string, prisma: PrismaClient) {
    const rows = await prisma.favorito.findMany({
      where:   { compradorId },
      include: { producto: { include: productoInclude } },
      orderBy: { creadoEn: "desc" },
    });
    return rows.map(mapFav);
  },

  async exists(compradorId: string, productoId: string, prisma: PrismaClient): Promise<boolean> {
    const count = await prisma.favorito.count({ where: { compradorId, productoId } });
    return count > 0;
  },

  async add(compradorId: string, productoId: string, prisma: PrismaClient) {
    await prisma.favorito.create({ data: { compradorId, productoId } });
    return true;
  },

  async remove(compradorId: string, productoId: string, prisma: PrismaClient) {
    await prisma.favorito.deleteMany({ where: { compradorId, productoId } });
    return false;
  },

  /** usuarioIds de los compradores que tienen este producto en favoritos */
  async findUsuariosQueFavoritearon(productoId: string, prisma: PrismaClient): Promise<string[]> {
    const favs = await prisma.favorito.findMany({
      where:  { productoId },
      select: { comprador: { select: { usuarioId: true } } },
    });
    return favs.map((f) => f.comprador.usuarioId);
  },
};
