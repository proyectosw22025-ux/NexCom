import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:               z.enum(["development", "production", "test"]).default("development"),
  PORT:                   z.coerce.number().default(4000),

  DATABASE_URL:           z.string().min(1, "DATABASE_URL es requerida"),
  REDIS_URL:              z.string().min(1, "REDIS_URL es requerida"),

  JWT_ACCESS_SECRET:      z.string().min(32, "JWT_ACCESS_SECRET debe tener al menos 32 caracteres"),
  JWT_REFRESH_SECRET:     z.string().min(32, "JWT_REFRESH_SECRET debe tener al menos 32 caracteres"),
  JWT_ACCESS_EXPIRES_IN:  z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  STRIPE_SECRET_KEY:      z.string().startsWith("sk_", "Debe ser una clave Stripe válida"),
  STRIPE_WEBHOOK_SECRET:  z.string().startsWith("whsec_", "Debe ser un secret de webhook Stripe válido"),

  MAIL_HOST:              z.string().min(1),
  MAIL_PORT:              z.coerce.number().default(2525),
  MAIL_USER:              z.string().min(1),
  MAIL_PASS:              z.string().min(1),
  MAIL_FROM:              z.string().default("NexCom <noreply@nexcom.bo>"),

  FRONTEND_URL:           z.string().url().default("http://localhost:3000"),
  GRAPHQL_PATH:           z.string().default("/graphql"),

  CACHE_TTL_PRODUCTO:     z.coerce.number().default(300),
  CACHE_TTL_CATALOGO:     z.coerce.number().default(180),
  CACHE_TTL_BUSQUEDA:     z.coerce.number().default(60),
  CACHE_TTL_CATEGORIAS:   z.coerce.number().default(3600),
  CACHE_TTL_OFERTAS:      z.coerce.number().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:\n");
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
