import redis from "./redis.client.js";

/**
 * Throttling de inicio de sesión por cuenta (anti–fuerza bruta / credential stuffing).
 *
 * Complementa el rate-limit global por IP: aquí el conteo es por **email**, así que
 * un ataque distribuido desde muchas IPs contra una sola cuenta también se frena.
 * Estado en Redis (consistente entre réplicas). Si Redis cae, **falla en abierto**
 * (no bloquea tráfico legítimo) — misma filosofía que el rate-limit global.
 */
const MAX_FALLOS = 5;
const VENTANA_S  = 15 * 60; // los fallos cuentan dentro de 15 min
const BLOQUEO_S  = 15 * 60; // y bloquean 15 min al alcanzar el máximo

const keyFail = (email: string) => `login-fail:${email.toLowerCase()}`;
const keyLock = (email: string) => `login-lock:${email.toLowerCase()}`;

/** Segundos restantes de bloqueo (0 si no está bloqueada). */
export async function segundosBloqueo(email: string): Promise<number> {
  try {
    const ttl = await redis.ttl(keyLock(email));
    return ttl > 0 ? ttl : 0;
  } catch {
    return 0; // fail-open
  }
}

/** Registra un intento fallido; bloquea la cuenta al alcanzar el máximo. */
export async function registrarFallo(email: string): Promise<{ bloqueado: boolean; intentos: number }> {
  try {
    const k = keyFail(email);
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, VENTANA_S);
    if (n >= MAX_FALLOS) {
      await redis.set(keyLock(email), "1", "EX", BLOQUEO_S);
      await redis.del(k);
      return { bloqueado: true, intentos: n };
    }
    return { bloqueado: false, intentos: n };
  } catch {
    return { bloqueado: false, intentos: 0 }; // fail-open
  }
}

/** Limpia contadores tras un login exitoso. */
export async function limpiarFallos(email: string): Promise<void> {
  try {
    await redis.del(keyFail(email), keyLock(email));
  } catch {
    /* noop */
  }
}

// ── Throttle de REGISTRO por IP (anti-spam de cuentas) ───────────────────────
// Con la verificación por correo desactivada, crear cuentas es instantáneo;
// este límite evita la creación masiva desde una misma IP. Fail-open.
const REG_MAX       = 5;
const REG_VENTANA_S = 60 * 60; // 1 hora

export async function registroPermitido(ip: string | null): Promise<boolean> {
  if (!ip) return true; // sin IP identificable no se puede acotar — no bloquear
  try {
    const k = `reg-ip:${ip}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, REG_VENTANA_S);
    return n <= REG_MAX;
  } catch {
    return true; // fail-open
  }
}

export const _config = { MAX_FALLOS, VENTANA_S, BLOQUEO_S, REG_MAX, REG_VENTANA_S };
