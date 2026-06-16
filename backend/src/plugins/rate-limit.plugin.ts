import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import redis from "../shared/redis.client.js";

/**
 * Rate limiting global por IP como protección base contra abuso/DoS y
 * fuerza bruta en `/graphql` (donde viven las mutaciones de auth).
 *
 * - 300 req/min por IP cubre el uso normal de un SPA (queries del catálogo,
 *   carrito, etc.) sin estorbar, pero corta los picos automatizados.
 * - `/health` (healthcheck de Railway) y `/webhooks/*` (reintentos de Stripe,
 *   que pueden llegar en ráfaga) quedan exentos.
 *
 * Nota: el límite es por IP a nivel de endpoint. Un límite granular por
 * operación GraphQL (p. ej. solo `login`) requeriría inspeccionar el body;
 * queda documentado como mejora en SECURITY_CHECKLIST.md.
 *
 * Store compartido en Redis: el conteo de peticiones se guarda en Redis, no en
 * memoria del proceso. Así el límite es **consistente entre N instancias** del
 * backend (escalado horizontal); con store en memoria, cada réplica contaría por
 * separado y el límite real sería N×300. `skipOnError: true` hace que, si Redis
 * cae, el rate-limit no bloquee tráfico legítimo (falla en abierto).
 */
export async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    global:      true,
    max:         300,
    timeWindow:  "1 minute",
    redis,
    skipOnError: true,
    nameSpace:   "nexcom-rl:",
    allowList:   (req) => req.url === "/health" || req.url.startsWith("/webhooks/"),
    errorResponseBuilder: () => ({
      statusCode: 429,
      error:      "Too Many Requests",
      message:    "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
    }),
  });
}
