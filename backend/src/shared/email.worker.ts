import { Worker } from "bullmq";
import { EMAIL_QUEUE, crearConexionCola, type EmailJob } from "./queue.js";
import { sendMailNow } from "./mailer.js";

let worker: Worker<EmailJob> | null = null;

/**
 * Arranca el worker que procesa la cola de emails. Reintentos y backoff los
 * define la cola (ver queue.ts). Se llama una vez al iniciar el servidor.
 */
export function startEmailWorker() {
  if (worker) return worker;

  worker = new Worker<EmailJob>(
    EMAIL_QUEUE,
    async (job) => {
      await sendMailNow(job.data.to, job.data.subject, job.data.html);
    },
    { connection: crearConexionCola(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} falló (intento ${job?.attemptsMade}):`, err.message);
  });
  worker.on("ready", () => console.log("[EmailWorker] Listo — procesando cola de emails"));

  return worker;
}
