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
    { termino, pagina = 1, limite = 20, categoriaId }:
      { termino: string; pagina?: number; limite?: number; categoriaId?: string | null },
    prisma: PrismaClient,
  ) {
    const q = termino.trim();
    if (!q) return { items: [], total: 0, pagina, totalPaginas: 0, termino: q };

    const hash     = hashParams({ q, pagina, limite, categoriaId });
    const cacheKey = `busqueda:${hash}`;
    const cached   = await getFromCache<object>(cacheKey);
    if (cached) return cached;

    const { items, total } = await busquedaRepository.buscar(
      { termino: q, categoriaId, pagina, limite },
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
};
