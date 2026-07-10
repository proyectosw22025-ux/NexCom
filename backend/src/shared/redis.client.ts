import Redis, { type RedisOptions } from "ioredis";
import { env } from "../config/env.js";

// Upstash usa rediss:// (TLS), Redis local usa redis://
const isTLS = env.REDIS_URL.startsWith("rediss://");

// Errores por los que NO tiene sentido reconectar en bucle: al superar el
// límite mensual del plan gratuito de Upstash ("max requests limit exceeded")
// o con credenciales inválidas, cada reintento envía otro AUTH y vuelve a
// fallar → tormenta de reconexión que agota más la cuota y llena los logs.
export const FATAL_REDIS = /max requests limit exceeded|WRONGPASS|NOAUTH|invalid password/i;

/** Opciones resilientes compartidas: backoff acotado + no reconectar ante errores fatales. */
export function baseRedisOptions(): RedisOptions {
  return {
    lazyConnect: true,
    // Reintenta con backoff pero se rinde tras 8 intentos (~20s) para no martillar.
    retryStrategy: (times) => (times > 8 ? null : Math.min(times * 200, 3000)),
    // Ante un error fatal (cuota/credenciales) cierra sin reconectar.
    reconnectOnError: (err) => !FATAL_REDIS.test(err.message),
    ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

const redis = new Redis(env.REDIS_URL, {
  ...baseRedisOptions(),
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => console.log("[Redis] Conectado en", env.REDIS_URL));
redis.on("error",   (err) => console.error("[Redis] Error:", err.message));
redis.on("close",   () => console.warn("[Redis] Conexión cerrada"));

export default redis;
