import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

let enabled = false;

/**
 * Inicializa Sentry SOLO si SENTRY_DSN está definida. Sin DSN queda inerte:
 * no envía nada y no afecta el comportamiento (deploy seguro sin configurar).
 */
export function initSentry(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn:              env.SENTRY_DSN,
    environment:      env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% de trazas de rendimiento
  });
  enabled = true;
  console.log("[Sentry] error tracking activo");
}

/** Reporta un error a Sentry (no-op si no está habilitado). */
export function captureError(error: unknown, contexto?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(error, contexto ? { extra: contexto } : undefined);
}

/**
 * Errores GraphQL "esperados" (de negocio/validación) que NO deben ensuciar
 * Sentry. Solo reportamos lo inesperado (bugs, fallos de infra).
 */
const CODIGOS_ESPERADOS = new Set([
  "BAD_USER_INPUT", "FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED",
  "UNVERIFIED_EMAIL", "GRAPHQL_VALIDATION_FAILED", "GRAPHQL_PARSE_FAILED",
]);

export function esErrorInesperado(err: { extensions?: { code?: unknown } }): boolean {
  const code = err?.extensions?.code;
  return typeof code !== "string" || !CODIGOS_ESPERADOS.has(code);
}
