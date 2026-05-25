import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import type Stripe from "stripe";

export interface UsuarioJWT {
  id:                string;
  rol:               "ADMIN" | "VENDEDOR" | "COMPRADOR";
  perfilVendedorId?: string | null;
  perfilCompradorId?: string | null;
}

export interface NexComContext {
  user:   UsuarioJWT | null; // null si la petición no tiene JWT válido
  prisma: PrismaClient;
  redis:  Redis;
  stripe: Stripe;
}
