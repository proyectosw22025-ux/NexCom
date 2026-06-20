import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";

// BullMQ exige una conexión con maxRetriesPerRequest: null (no se puede reusar
// la del cache, que usa maxRetriesPerRequest: 3). Se crea bajo demanda.
const isTLS = env.REDIS_URL.startsWith("rediss://");

export function crearConexionCola(opts?: { failFast?: boolean }) {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // requerido por BullMQ
    lazyConnect:          true,
    // El productor (encolarEmail) falla rápido si Redis no está → activa el
    // fallback a envío directo sin colgar la request. El worker sí espera.
    ...(opts?.failFast ? { enableOfflineQueue: false } : {}),
    ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
  });
}

export const EMAIL_QUEUE = "emails";

export interface EmailJob {
  to:      string;
  subject: string;
  html:    string;
}

// Cola de emails. Conexión perezosa: solo se abre al encolar/procesar.
export const emailQueue = new Queue<EmailJob>(EMAIL_QUEUE, {
  connection: crearConexionCola({ failFast: true }),
  defaultJobOptions: {
    attempts: 3,                                   // reintenta hasta 3 veces
    backoff:  { type: "exponential", delay: 2000 }, // 2s, 4s, 8s
    removeOnComplete: true,
    removeOnFail:     200,
  },
});

/** Encola un email. Lanza si Redis/cola no está disponible (el caller decide fallback). */
export async function encolarEmail(job: EmailJob) {
  await emailQueue.add("send", job);
}
