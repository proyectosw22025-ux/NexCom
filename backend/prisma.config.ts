import { defineConfig } from "prisma/config";
import "dotenv/config";

// Las migraciones (prisma migrate) requieren una conexión DIRECTA a Postgres,
// no el pooler (PgBouncer en modo transacción no soporta los locks de migración).
// El runtime de la app usa DATABASE_URL (endpoint pooled de Neon) en
// shared/prisma.client.ts; aquí, para migraciones, preferimos DIRECT_URL.
// Fallback a DATABASE_URL si DIRECT_URL no está definida (entornos sin pooler).
export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
