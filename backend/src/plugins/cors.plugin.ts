import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

export async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin:      env.NODE_ENV === "development" ? true : env.FRONTEND_URL,
    methods:     ["GET", "POST", "OPTIONS"],
    credentials: true,
  });
}
