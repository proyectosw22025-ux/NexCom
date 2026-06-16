import redis from "./redis.client.js";
import { acquireLock, releaseLock } from "./lock.util.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lee de caché o produce el valor, con protección contra "cache stampede".
 *
 * Cuando una clave caliente expira, sin protección **todos** los requests
 * concurrentes pegan a la base de datos a la vez (lo medimos: el 1er request
 * post-deploy tardó 2.1 s). Aquí solo el primer proceso obtiene un lock y
 * regenera; los demás esperan brevemente y leen el valor recién poblado.
 *
 * Degrada con gracia: si Redis no está, simplemente produce el valor.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const cached = await getFromCache<T>(key);
  if (cached !== null) return cached;

  const lockKey = `lock:cache:${key}`;
  const gotLock = await acquireLock(lockKey, 10);

  if (!gotLock) {
    // Otro proceso está regenerando: espera corta y reintenta leer el cache
    await sleep(120);
    const retry = await getFromCache<T>(key);
    if (retry !== null) return retry;
    // Si sigue vacío, producimos igual para no dejar al usuario esperando
  }

  try {
    const value = await producer();
    await setCache(key, value, ttlSeconds);
    return value;
  } finally {
    if (gotLock) await releaseLock(lockKey);
  }
}

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
  catalogo:        (pagina: number, limite: number, categoriaId?: string | null, soloActivos?: boolean | null) =>
    `catalogo:list:${pagina}:${limite}:${categoriaId ?? "all"}:${soloActivos !== false ? "act" : "todos"}`,
  catalogoVendedor:(vendedorId: string, page: number) => `catalogo:v:${vendedorId}:p:${page}`,
  busqueda:        (hash: string)                   => `busqueda:${hash}`,
  categorias:      ()                               => `categorias:todas`,
  ofertasActivas:  ()                               => `ofertas:activas`,
  perfilVendedor:  (id: string)                     => `perfil:vendedor:${id}`,
};
