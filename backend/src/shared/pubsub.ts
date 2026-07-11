import Redis from "ioredis";
import { createPubSub } from "graphql-yoga";
import { createRedisEventTarget } from "@graphql-yoga/redis-event-target";
import { env } from "../config/env.js";
import { baseRedisOptions } from "./redis.client.js";

function createConnection() {
  return new Redis(env.REDIS_URL, {
    ...baseRedisOptions(),
    // El subscriber usa comandos bloqueantes: no limitar reintentos por request.
    maxRetriesPerRequest: null,
  });
}

// Pub/Sub requiere conexiones dedicadas (distintas de la conexión de comandos en redis.client.ts)
const publishClient   = createConnection();
const subscribeClient = createConnection();

publishClient.on("error",   (err: Error) => console.error("[Redis pubsub] publisher error:", err.message));
subscribeClient.on("error", (err: Error) => console.error("[Redis pubsub] subscriber error:", err.message));

publishClient.connect()
  .catch((err: Error) => console.warn("[Redis pubsub] publisher no disponible:", err.message));
subscribeClient.connect()
  .catch((err: Error) => console.warn("[Redis pubsub] subscriber no disponible:", err.message));

const eventTarget = createRedisEventTarget({ publishClient, subscribeClient });

export interface NotificacionPayload {
  id:       string;
  tipo:     string;
  titulo:   string;
  mensaje:  string;
  leido:    boolean;
  url:      string | null;
  ordenId:  string | null;
  creadoEn: string;
}

type PubSubEvents = {
  [key: `notificacion:${string}`]: [NotificacionPayload];
};

export const pubsub = createPubSub<PubSubEvents>({ eventTarget });

/**
 * Publica una notificación en tiempo real. Es "fire-and-forget" y **nunca lanza**:
 * si el pub/sub de Redis no está disponible (p. ej. cuota de Upstash agotada), la
 * publicación se pierde silenciosamente pero NO rompe la transacción de negocio
 * que la disparó (confirmar pago, reembolso, etc.). La notificación ya quedó
 * persistida en la BD, así que el usuario la ve igual al recargar; solo se pierde
 * el "push" instantáneo. Evita además unhandled rejections en los logs.
 */
export function publishNotificacion(usuarioId: string, notificacion: NotificacionPayload) {
  try {
    const r = pubsub.publish(`notificacion:${usuarioId}`, notificacion) as unknown;
    if (r && typeof (r as Promise<unknown>).catch === "function") {
      (r as Promise<unknown>).catch((e) =>
        console.warn("[pubsub] publish falló:", (e as Error).message));
    }
  } catch (e) {
    console.warn("[pubsub] publish falló:", (e as Error).message);
  }
}
