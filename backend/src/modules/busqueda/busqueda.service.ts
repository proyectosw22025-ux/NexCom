import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import { busquedaRepository } from "./busqueda.repository.js";
import { getFromCache, setCache } from "../../shared/cache.util.js";
import { env } from "../../config/env.js";

function hashParams(params: object): string {
  return crypto.createHash("sha1").update(JSON.stringify(params)).digest("hex");
}

export const busquedaService = {
  async buscar(
    { termino, pagina = 1, limite = 20, categoriaId, vendedorId }:
      { termino: string; pagina?: number; limite?: number; categoriaId?: string | null; vendedorId?: string | null },
    prisma: PrismaClient,
  ) {
    const q = termino.trim();
    if (!q) return { items: [], total: 0, pagina, totalPaginas: 0, termino: q };

    const hash     = hashParams({ q, pagina, limite, categoriaId, vendedorId });
    const cacheKey = `busqueda:${hash}`;
    const cached   = await getFromCache<object>(cacheKey);
    if (cached) return cached;

    const { items, total } = await busquedaRepository.buscar(
      { termino: q, categoriaId, vendedorId, pagina, limite },
      prisma,
    );

    const result = {
      items,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      termino:      q,
    };

    await setCache(cacheKey, result, env.CACHE_TTL_BUSQUEDA);
    return result;
  },

  async sugerir(termino: string, prisma: PrismaClient) {
    const q = termino.trim();
    if (q.length < 2) return [];

    const cacheKey = `sugerencias:${q.toLowerCase()}`;
    const cached   = await getFromCache<{ id: string; nombre: string; precio: string; imagenUrl: string | null }[]>(cacheKey);
    if (cached) return cached;

    const rows = await busquedaRepository.sugerir(q, prisma);
    const sugerencias = rows.map((p) => ({
      id:        p.id,
      nombre:    p.nombre,
      precio:    p.precio.toString(),
      imagenUrl: p.imagenes[0]?.url ?? null,
    }));
    await setCache(cacheKey, sugerencias, env.CACHE_TTL_BUSQUEDA);
    return sugerencias;
  },
};
