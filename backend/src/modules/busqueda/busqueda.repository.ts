import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const include = {
  categoria: true,
  vendedor:  true,
  imagenes:  { orderBy: { orden: "asc" as const } },
  etiquetas: { include: { etiqueta: true } },
};

function mapEtiquetas<T extends { etiquetas: { etiqueta: { id: string; nombre: string; slug: string } }[] }>(p: T) {
  return { ...p, etiquetas: p.etiquetas.map((pe) => pe.etiqueta) };
}

export const busquedaRepository = {
  async buscar(
    { termino, categoriaId, vendedorId, pagina, limite }:
      { termino: string; categoriaId?: string | null; vendedorId?: string | null; pagina: number; limite: number },
    prisma: PrismaClient,
  ) {
    const offset = (pagina - 1) * limite;
    const categoryFilter = categoriaId
      ? Prisma.sql`AND p.categoria_id = ${categoriaId}`
      : Prisma.sql``;
    // Filtro por tienda: acota la búsqueda a los productos de un vendedor.
    const vendorFilter = vendedorId
      ? Prisma.sql`AND p.vendedor_id = ${vendedorId}`
      : Prisma.sql``;

    // FTS (relevancia semántica) + ILIKE (subcadena) + pg_trgm (tolerante a
    // errores de tipeo). El operador `%` usa el índice GIN trigram.
    const idRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM productos p
      WHERE p.activo = true
      ${categoryFilter}
      ${vendorFilter}
      AND (
        to_tsvector('spanish', coalesce(p.nombre,'') || ' ' || coalesce(p.descripcion,''))
          @@ plainto_tsquery('spanish', ${termino})
        OR p.nombre ILIKE ${`%${termino}%`}
        OR word_similarity(${termino}, p.nombre) > 0.4
      )
      ORDER BY
        ts_rank(
          to_tsvector('spanish', coalesce(p.nombre,'') || ' ' || coalesce(p.descripcion,'')),
          plainto_tsquery('spanish', ${termino})
        ) DESC,
        word_similarity(${termino}, p.nombre) DESC,
        p.destacado DESC
      LIMIT  ${Prisma.raw(String(limite))}
      OFFSET ${Prisma.raw(String(offset))}
    `);

    const countRows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM productos p
      WHERE p.activo = true
      ${categoryFilter}
      ${vendorFilter}
      AND (
        to_tsvector('spanish', coalesce(p.nombre,'') || ' ' || coalesce(p.descripcion,''))
          @@ plainto_tsquery('spanish', ${termino})
        OR p.nombre ILIKE ${`%${termino}%`}
        OR word_similarity(${termino}, p.nombre) > 0.4
      )
    `);

    const ids   = idRows.map((r) => r.id);
    const total = Number(countRows[0]?.count ?? 0);

    if (ids.length === 0) return { items: [], total };

    const productos = await prisma.producto.findMany({
      where:   { id: { in: ids } },
      include,
    });

    // Restaurar orden de relevancia dado por FTS
    const byId  = new Map(productos.map((p) => [p.id, p]));
    const items = ids.flatMap((id) => {
      const p = byId.get(id);
      return p ? [mapEtiquetas(p)] : [];
    });

    return { items, total };
  },

  /** Sugerencias ligeras para autocompletado (typeahead): id, nombre, precio, miniatura. */
  async sugerir(termino: string, prisma: PrismaClient) {
    return prisma.producto.findMany({
      where:  { activo: true, nombre: { contains: termino, mode: "insensitive" } },
      select: {
        id: true, nombre: true, precio: true,
        imagenes: { orderBy: { orden: "asc" }, take: 1, select: { url: true } },
      },
      orderBy: [{ destacado: "desc" }, { nombre: "asc" }],
      take:    6,
    });
  },
};
