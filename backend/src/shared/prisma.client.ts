import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development"
    ? ["query", "warn", "error"]
    : ["error"],
});

prisma.$connect()
  .then(() => console.log("[Prisma] Conectado a PostgreSQL"))
  .catch((err) => {
    console.error("[Prisma] Error de conexión:", err.message);
    process.exit(1);
  });

export default prisma;
