import type { FastifyInstance } from "fastify";
import { extractBearerToken, verifyAccessToken } from "../shared/jwt.util.js";

// Este plugin corre en cada request ANTES de llegar al resolver GraphQL.
// Extrae el JWT del header, lo verifica y agrega el usuario al request.
// Si no hay token o es inválido, agrega null — el resolver decide si rechazar.
export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("user", null);

  app.addHook("onRequest", async (request) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) return;

    const payload = verifyAccessToken(token);
    if (payload) {
      (request as any).user = payload;
    }
  });
}
