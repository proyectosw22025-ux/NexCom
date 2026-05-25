import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
import type { UsuarioJWT } from "./types/context.type.js";

// ── Access Token (vida corta: 15min) ─────────────────────────
export function signAccessToken(payload: UsuarioJWT): string {
  const opts = { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions;
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): UsuarioJWT | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as UsuarioJWT;
  } catch {
    return null;
  }
}

// ── Refresh Token (vida larga: 7 días) ───────────────────────
export function generateRefreshToken(): string {
  // 64 bytes aleatorios → 128 caracteres hex — nunca predecible
  return crypto.randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ── Extraer token del header Authorization ───────────────────
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
