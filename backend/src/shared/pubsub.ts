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

export function publishNotificacion(usuarioId: string, notificacion: NotificacionPayload) {
  pubsub.publish(`notificacion:${usuarioId}`, notificacion);
}
