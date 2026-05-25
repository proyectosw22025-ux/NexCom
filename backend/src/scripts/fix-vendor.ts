import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("Vendedor123!", 12);
  const u = await prisma.usuario.update({
    where:  { email: "vendedor@nexcom.bo" },
    data:   { passwordHash: hash, verificado: true, activo: true },
  });
  console.log("Password actualizada:", u.email, "verificado:", u.verificado);
}

main().catch(console.error).finally(() => prisma.$disconnect());
