import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import type Stripe from "stripe";

export interface UsuarioJWT {
  id:                string;
  rol:               "ADMIN" | "VENDEDOR" | "CLIENTE";
  perfilVendedorId?: string | null;
  perfilCompradorId?: string | null;
}

export interface NexComContext {
  user:   UsuarioJWT | null; // null si la petición no tiene JWT válido
  ip:     string | null;     // IP del cliente (throttling de acciones anónimas)
  prisma: PrismaClient;
  redis:  Redis;
  stripe: Stripe;
}
