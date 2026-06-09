import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

const VERCEL_PATTERN = /^https:\/\/.*\.vercel\.app$/;
const RAILWAY_PATTERN = /^https:\/\/.*\.railway\.app$/;

export async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (env.NODE_ENV === "development") { cb(null, true); return; }
      if (!origin) { cb(null, true); return; } // server-to-server
      if (
        origin === env.FRONTEND_URL ||
        VERCEL_PATTERN.test(origin) ||
        RAILWAY_PATTERN.test(origin) ||
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
