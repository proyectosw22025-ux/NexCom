import "dotenv/config";
import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const hash  = await bcryptjs.hash("Admin1234!", 12);
  const admin = await prisma.usuario.upsert({
    where:  { email: "admin@nexcom.bo" },
    update: { passwordHash: hash, verificado: true, activo: true },
    create: { email: "admin@nexcom.bo", passwordHash: hash, rol: "ADMIN", verificado: true, activo: true },
  });
  console.log("Admin creado:", admin.email, "|", admin.rol);
}

main().catch(console.error).finally(() => prisma.$disconnect());
