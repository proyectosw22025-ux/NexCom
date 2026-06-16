import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

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
 */
export async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    global:     true,
    max:        300,
    timeWindow: "1 minute",
    allowList:  (req) => req.url === "/health" || req.url.startsWith("/webhooks/"),
    errorResponseBuilder: () => ({
      statusCode: 429,
      error:      "Too Many Requests",
      message:    "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
    }),
  });
}
