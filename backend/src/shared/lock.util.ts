import redis from "./redis.client.js";

/**
 * Locks distribuidos sobre Redis (`SET key val NX EX ttl`).
 *
 * Sirven para dos cosas a escala horizontal:
 *  1. Garantizar que un job periódico corra en **una sola** instancia
 *     (aunque haya N réplicas del backend).
 *  2. Evitar "cache stampede": que un solo proceso regenere un valor caro
 *     mientras los demás esperan/sirven lo cacheado.
 *
 * Falla en abierto: si Redis no está disponible, `acquireLock` devuelve `false`
 * en vez de lanzar — el llamador decide cómo degradar.
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const res = await redis.set(key, "1", "EX", ttlSeconds, "NX");
    return res === "OK";
  } catch {
    return false;
  }
}

export async function releaseLock(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Ignorar: el TTL liberará el lock de todas formas
  }
}

/**
 * Ejecuta `fn` solo si se obtiene el lock. Devuelve `true` si corrió, `false`
 * si otra instancia ya tenía el lock. El lock se libera al terminar.
 */
export async function runWithLock(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const got = await acquireLock(key, ttlSeconds);
  if (!got) return false;
  try {
    await fn();
    return true;
  } finally {
    await releaseLock(key);
  }
}
