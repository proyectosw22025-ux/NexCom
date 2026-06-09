import Redis from "ioredis";
import { env } from "../config/env.js";

// Upstash usa rediss:// (TLS), Redis local usa redis://
const isTLS = env.REDIS_URL.startsWith("rediss://");

const redis = new Redis(env.REDIS_URL, {
  lazyConnect:          true,
  retryStrategy:        (times) => Math.min(times * 100, 3000),
  maxRetriesPerRequest: 3,
  ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
});

redis.on("connect", () => console.log("[Redis] Conectado en", env.REDIS_URL));
redis.on("error",   (err) => console.error("[Redis] Error:", err.message));
redis.on("close",   () => console.warn("[Redis] Conexión cerrada"));

export default redis;
