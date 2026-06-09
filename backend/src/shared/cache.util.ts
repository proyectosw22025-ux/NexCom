import redis from "./redis.client.js";

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Cache write falla silenciosamente cuando Redis no está disponible
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Ignorar si Redis no disponible
  }
}

// Invalida todas las claves que coinciden con un patrón (usar con cuidado en prod)
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Ignorar si Redis no disponible
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
