import redis from "./redis.client.js";

export async function getFromCache<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

// Invalida todas las claves que coinciden con un patrón (usar con cuidado en prod)
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Claves de caché estandarizadas — punto único de definición
export const CacheKeys = {
  producto:        (id: string)                     => `producto:${id}`,
  catalogoVendedor:(vendedorId: string, page: number) => `catalogo:v:${vendedorId}:p:${page}`,
  busqueda:        (hash: string)                   => `busqueda:${hash}`,
  categorias:      ()                               => `categorias:todas`,
  ofertasActivas:  ()                               => `ofertas:activas`,
  perfilVendedor:  (id: string)                     => `perfil:vendedor:${id}`,
};
