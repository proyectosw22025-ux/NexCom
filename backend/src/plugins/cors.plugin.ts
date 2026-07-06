import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

// Solo previews del PROPIO proyecto en Vercel (nex-com-*): permitir cualquier
// *.vercel.app dejaría que un tercero despliegue allí y llame a la API desde
// el navegador. El origen exacto de producción entra por FRONTEND_URL.
const VERCEL_PATTERN = /^https:\/\/nex-com[a-z0-9-]*\.vercel\.app$/;

export async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (env.NODE_ENV === "development") { cb(null, true); return; }
      if (!origin) { cb(null, true); return; } // server-to-server
      if (
        origin === env.FRONTEND_URL ||
        VERCEL_PATTERN.test(origin) ||
        origin === "http://localhost:3000"
      ) {
        cb(null, true);
      } else {
        cb(new Error(`CORS bloqueado: ${origin}`), false);
      }
    },
    methods:     ["GET", "POST", "OPTIONS"],
    credentials: true,
  });
}
