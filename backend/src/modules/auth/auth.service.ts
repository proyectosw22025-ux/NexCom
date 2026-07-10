import bcrypt from "bcryptjs";
import crypto from "crypto";
import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";

import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../../shared/jwt.util.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../shared/mailer.js";
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from "./auth.validators.js";
import * as repo from "./auth.repository.js";
import { segundosBloqueo, registrarFallo, limpiarFallos } from "../../shared/login-throttle.js";
import { saldosService } from "../saldos/saldos.service.js";
import { getConfigNumber } from "../../shared/config.util.js";
import { publishNotificacion } from "../../shared/pubsub.js";
import { urlFirmadaKyc } from "../../shared/cloudinary.js";
import { Decimal } from "decimal.js";

// Campos que devuelve un PerfilVendedorPublico (incluye estado KYC del dueño).
const PERFIL_VENDEDOR_SELECT = {
  id: true, nombreNegocio: true, descripcion: true, ciudad: true, telefono: true,
  logoUrl: true, ratingPromedio: true, totalVentas: true, totalResenias: true,
  plan: true, planVenceEn: true, verificado: true, usuarioId: true,
  estadoVerificacion: true, verificacionNotas: true, documentoUrl: true, documentoTipo: true,
} as const;

const TIPOS_DOCUMENTO = ["CI", "NIT", "PASAPORTE"];

// Costo de bcrypt: 10 es el estándar OWASP. Reduce el tiempo de CPU del login
// ~2-4× frente a 12 en CPU compartida, manteniendo seguridad adecuada.
const BCRYPT_COST = 10;

// Verificación de email por correo. DESACTIVADA mientras no haya SMTP operativo
// en producción: con ella activa y el correo caído, los usuarios nuevos quedaban
// bloqueados al cerrar sesión (no podían verificar → no podían volver a entrar).
// Al configurar el SMTP real, cambiar a true: el registro vuelve a crear cuentas
// sin verificar + enviar el correo, y el login vuelve a exigir verificación.
const VERIFICACION_EMAIL_ACTIVA = false;

// ── Helpers privados ──────────────────────────────────────────────────────────

function badInput(message: string): never {
  throw new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}

/** Registra un evento de seguridad de login (best-effort; nunca rompe el flujo). */
async function registrarEventoLogin(
  prisma: PrismaClient, tipo: string, email: string, metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.eventoSeguridad.create({ data: { tipo, metadata: { email, ...metadata } } });
  } catch {
    /* la auditoría no debe bloquear el login */
  }
}

/** Cuenta un intento fallido y audita (LOGIN_FALLIDO, o LOGIN_BLOQUEADO si gatilla). */
async function fallarLogin(prisma: PrismaClient, email: string): Promise<void> {
  const { bloqueado, intentos } = await registrarFallo(email);
  await registrarEventoLogin(prisma, bloqueado ? "LOGIN_BLOQUEADO" : "LOGIN_FALLIDO", email, { intentos });
}

type UsuarioConPerfil = NonNullable<Awaited<ReturnType<typeof repo.findUsuarioConPerfil>>>;

async function buildAuthPayload(usuario: UsuarioConPerfil, prisma: PrismaClient, dispositivo?: string) {
  const accessToken = signAccessToken({
    id:                usuario.id,
    rol:               usuario.rol as "ADMIN" | "VENDEDOR" | "COMPRADOR",
    perfilVendedorId:  usuario.perfilVendedor?.id  ?? null,
    perfilCompradorId: usuario.perfilComprador?.id ?? null,
  });
  const refreshRaw  = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshRaw);

  const expiraEn = new Date();
  expiraEn.setDate(expiraEn.getDate() + 7); // 7 días

  await repo.saveRefreshToken({ usuarioId: usuario.id, tokenHash: refreshHash, expiraEn, dispositivo }, prisma);

  return { accessToken, refreshToken: refreshRaw, usuario };
}

// ── register ──────────────────────────────────────────────────────────────────

export async function register(rawInput: unknown, prisma: PrismaClient, dispositivo?: string) {
  const result = registerSchema.safeParse(rawInput);
  if (!result.success) {
    badInput(result.error.issues.map((i) => i.message).join(". "));
  }
  const input = result.data as RegisterInput;

  const existente = await repo.findUsuarioByEmail(input.email, prisma);
  if (existente) badInput("Ya existe una cuenta con ese email.");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  const usuario = await repo.createUsuarioConPerfil(
    {
      email: input.email,
      passwordHash,
      rol:   input.rol,
      // Sin verificación por correo activa, la cuenta nace lista para usarse.
      verificado: !VERIFICACION_EMAIL_ACTIVA,
      datosVendedor:  input.datosVendedor,
      datosComprador: input.datosComprador,
    },
    prisma
  );

  if (VERIFICACION_EMAIL_ACTIVA) {
    // Token de verificación (24 horas)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expiraEn    = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await repo.createTokenVerificacion(
      { usuarioId: usuario.id, token: verifyToken, tipo: "EMAIL_VERIFICACION", expiraEn },
      prisma
    );
    // Fuera del camino crítico: el token ya está persistido; el email viaja en
    // segundo plano (cola con reintentos / fallback). No retrasa la respuesta.
    void sendVerificationEmail(usuario.email, verifyToken).catch((err) =>
      console.error("[Auth] Falló el envío del email de verificación:", (err as Error).message),
    );
  }

  // createUsuarioConPerfil ya devuelve el usuario con perfiles incluidos
  return buildAuthPayload(usuario, prisma, dispositivo);
}

// ── login ─────────────────────────────────────────────────────────────────────

export async function login(rawInput: unknown, prisma: PrismaClient, dispositivo?: string) {
  const result = loginSchema.safeParse(rawInput);
  if (!result.success) {
    badInput(result.error.issues.map((i) => i.message).join(". "));
  }
  const input = result.data as LoginInput;
  const email = input.email;

  // Anti–fuerza bruta por cuenta: si está bloqueada, no se evalúa la contraseña.
  const bloqueo = await segundosBloqueo(email);
  if (bloqueo > 0) {
    await registrarEventoLogin(prisma, "LOGIN_BLOQUEADO", email);
    throw new GraphQLError(
      `Demasiados intentos fallidos. Vuelve a intentar en ${Math.ceil(bloqueo / 60)} minuto(s).`,
      { extensions: { code: "TOO_MANY_REQUESTS" } },
    );
  }

  const usuario = await repo.findUsuarioByEmailConPerfil(input.email, prisma);
  if (!usuario) {
    await fallarLogin(prisma, email);
    badInput("Credenciales incorrectas.");
  }

  const passwordOk = await bcrypt.compare(input.password, usuario.passwordHash);
  if (!passwordOk) {
    await fallarLogin(prisma, email);
    badInput("Credenciales incorrectas.");
  }

  if (!usuario.activo) {
    throw new GraphQLError("Tu cuenta ha sido desactivada. Contacta soporte.", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  if (VERIFICACION_EMAIL_ACTIVA && !usuario.verificado) {
    throw new GraphQLError("Debes verificar tu email antes de iniciar sesión.", {
      extensions: { code: "UNVERIFIED_EMAIL" },
    });
  }

  // Rehash progresivo: si el hash guardado usa un costo distinto al objetivo
  // (p. ej. cuentas viejas con cost 12), se recalcula con BCRYPT_COST al iniciar
  // sesión. Migra el parque de hashes sin pedir reset de contraseña.
  if (bcrypt.getRounds(usuario.passwordHash) !== BCRYPT_COST) {
    const nuevoHash = await bcrypt.hash(input.password, BCRYPT_COST);
    await repo.updatePasswordHash(usuario.id, nuevoHash, prisma);
  }

  await limpiarFallos(email); // login correcto → resetea el contador anti-bruteforce
  return buildAuthPayload(usuario, prisma, dispositivo);
}

// ── logout ────────────────────────────────────────────────────────────────────

export async function logout(refreshTokenRaw: string, prisma: PrismaClient): Promise<boolean> {
  const hash = hashRefreshToken(refreshTokenRaw);
  const rt   = await repo.findRefreshTokenByHash(hash, prisma);
  if (rt) await repo.revokeRefreshToken(rt.id, prisma);
  return true;
}

// ── refreshToken ──────────────────────────────────────────────────────────────

export async function refreshToken(tokenRaw: string, prisma: PrismaClient, dispositivo?: string) {
  const hash = hashRefreshToken(tokenRaw);
  const rt   = await repo.findRefreshTokenByHash(hash, prisma);

  if (!rt || rt.revocado) {
    throw new GraphQLError("Sesión expirada. Inicia sesión nuevamente.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  if (rt.expiraEn < new Date()) {
    await repo.revokeRefreshToken(rt.id, prisma);
    throw new GraphQLError("Sesión expirada. Inicia sesión nuevamente.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const usuario = await repo.findUsuarioConPerfil(rt.usuarioId, prisma);
  if (!usuario || !usuario.activo) {
    throw new GraphQLError("Cuenta no disponible.", { extensions: { code: "FORBIDDEN" } });
  }

  // Rotación: revocar el token anterior antes de emitir uno nuevo
  await repo.revokeRefreshToken(rt.id, prisma);

  return buildAuthPayload(usuario, prisma, dispositivo);
}

// ── verifyEmail ───────────────────────────────────────────────────────────────

export async function verifyEmail(token: string, prisma: PrismaClient): Promise<boolean> {
  const record = await repo.findTokenVerificacion(token, "EMAIL_VERIFICACION", prisma);
  if (!record) badInput("Token de verificación inválido o ya usado.");
  if (record.expiraEn < new Date()) badInput("El token de verificación ha expirado. Solicita uno nuevo.");

  await prisma.$transaction([
    prisma.tokenVerificacion.update({ where: { id: record.id }, data: { usado: true } }),
    prisma.usuario.update({ where: { id: record.usuarioId }, data: { verificado: true } }),
  ]);

  return true;
}

// ── requestPasswordReset ──────────────────────────────────────────────────────

export async function requestPasswordReset(email: string, prisma: PrismaClient): Promise<boolean> {
  const usuario = await repo.findUsuarioByEmail(email.toLowerCase(), prisma);
  // Siempre retornar true — no revelar si el email existe
  if (!usuario) return true;

  const token    = crypto.randomBytes(32).toString("hex");
  const expiraEn = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
  await repo.createTokenVerificacion(
    { usuarioId: usuario.id, token, tipo: "RESET_PASSWORD", expiraEn },
    prisma
  );
  // En segundo plano: además de acelerar, evita el canal lateral de tiempo
  // (si se esperara al SMTP, la respuesta tardaría más cuando el email existe
  // → permitiría enumerar cuentas midiendo la latencia).
  void sendPasswordResetEmail(usuario.email, token).catch((err) =>
    console.error("[Auth] Falló el envío del email de reset:", (err as Error).message),
  );
  return true;
}

// ── resetPassword ─────────────────────────────────────────────────────────────

export async function resetPassword(
  token: string,
  nuevaPassword: string,
  prisma: PrismaClient
): Promise<boolean> {
  const result = loginSchema.shape.password.safeParse(nuevaPassword);
  if (!result.success) badInput(result.error.issues[0].message);

  const record = await repo.findTokenVerificacion(token, "RESET_PASSWORD", prisma);
  if (!record) badInput("Token inválido o ya usado.");
  if (record.expiraEn < new Date()) badInput("El enlace de restablecimiento ha expirado.");

  const passwordHash = await bcrypt.hash(nuevaPassword, BCRYPT_COST);

  await prisma.$transaction([
    prisma.tokenVerificacion.update({ where: { id: record.id }, data: { usado: true } }),
    prisma.usuario.update({ where: { id: record.usuarioId }, data: { passwordHash } }),
  ]);

  // Revocar todas las sesiones activas (cierre de sesiones por seguridad)
  await repo.revokeAllRefreshTokensUsuario(record.usuarioId, prisma);

  return true;
}

// ── updatePassword ────────────────────────────────────────────────────────────

export async function updatePassword(
  usuarioId: string,
  passwordActual: string,
  nuevaPassword: string,
  prisma: PrismaClient
): Promise<boolean> {
  const result = loginSchema.shape.password.safeParse(nuevaPassword);
  if (!result.success) badInput(result.error.issues[0].message);

  const usuario = await repo.findUsuarioById(usuarioId, prisma);
  if (!usuario) throw new GraphQLError("Usuario no encontrado", { extensions: { code: "NOT_FOUND" } });

  const passwordOk = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!passwordOk) badInput("La contraseña actual es incorrecta.");

  const passwordHash = await bcrypt.hash(nuevaPassword, BCRYPT_COST);
  await repo.updatePasswordHash(usuarioId, passwordHash, prisma);

  // Revocar otras sesiones (la actual sigue válida hasta que expire el accessToken)
  await repo.revokeAllRefreshTokensUsuario(usuarioId, prisma);

  return true;
}

// ── me ────────────────────────────────────────────────────────────────────────

export async function getMe(usuarioId: string, prisma: PrismaClient) {
  return repo.findUsuarioConPerfil(usuarioId, prisma);
}

// ── vendedor público (tienda) ───────────────────────────────────────────────────

export async function getVendedorPublico(id: string, prisma: PrismaClient) {
  return prisma.perfilVendedor.findUnique({
    where:  { id },
    select: {
      id: true, nombreNegocio: true, descripcion: true, ciudad: true, telefono: true,
      logoUrl: true, ratingPromedio: true, totalVentas: true, totalResenias: true, plan: true, planVenceEn: true, verificado: true, usuarioId: true,
    },
  });
}

/**
 * "Responde rápido": mediana del tiempo de primera respuesta del vendedor a los
 * mensajes de los compradores < 24h, con al menos 3 conversaciones respondidas.
 * Se computa bajo demanda (field resolver), nunca en listados.
 */
export async function vendedorRespondeRapido(
  perfilVendedorId: string,
  vendedorUsuarioId: string | null | undefined,
  prisma: PrismaClient,
): Promise<boolean> {
  if (!vendedorUsuarioId) return false;
  const convs = await prisma.conversacion.findMany({
    where:  { vendedorId: perfilVendedorId },
    select: { mensajes: { orderBy: { creadoEn: "asc" }, select: { emisorId: true, creadoEn: true } } },
    take:   30,
  });
  const tiempos: number[] = [];
  for (const c of convs) {
    const primerComprador = c.mensajes.find((m) => m.emisorId !== vendedorUsuarioId);
    if (!primerComprador) continue;
    const respuesta = c.mensajes.find((m) => m.emisorId === vendedorUsuarioId && m.creadoEn > primerComprador.creadoEn);
    if (!respuesta) continue;
    tiempos.push(respuesta.creadoEn.getTime() - primerComprador.creadoEn.getTime());
  }
  if (tiempos.length < 3) return false;
  tiempos.sort((a, b) => a - b);
  const mediana = tiempos[Math.floor(tiempos.length / 2)]!;
  return mediana < 24 * 60 * 60 * 1000;
}

/**
 * Nº de disputas que el vendedor PERDIÓ (resueltas a favor del comprador).
 * Señal de confianza: alimenta el nivel de la tienda y la transparencia al
 * comprador. Se computa on-demand (field resolver), nunca en listados.
 */
export async function contarDisputasPerdidas(perfilVendedorId: string, prisma: PrismaClient): Promise<number> {
  return prisma.disputa.count({ where: { vendedorId: perfilVendedorId, estado: "RESUELTA_COMPRADOR" } });
}

export async function verificarVendedor(perfilVendedorId: string, verificado: boolean, prisma: PrismaClient) {
  return prisma.perfilVendedor.update({
    where:  { id: perfilVendedorId },
    data:   { verificado, estadoVerificacion: verificado ? "APROBADO" : "RECHAZADO" },
    select: PERFIL_VENDEDOR_SELECT,
  });
}

// ── KYC del vendedor (confianza progresiva) ─────────────────────────────────────

/** El vendedor envía su documento de identidad para revisión (estado → PENDIENTE). */
export async function enviarVerificacion(
  perfilVendedorId: string,
  input: { documentoUrl: string; documentoTipo: string },
  prisma: PrismaClient,
) {
  const perfil = await prisma.perfilVendedor.findUnique({
    where: { id: perfilVendedorId }, select: { estadoVerificacion: true },
  });
  if (!perfil) {
    throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  if (perfil.estadoVerificacion === "APROBADO") {
    throw new GraphQLError("Tu cuenta ya está verificada.", { extensions: { code: "BAD_USER_INPUT" } });
  }
  if (perfil.estadoVerificacion === "PENDIENTE") {
    throw new GraphQLError("Ya tienes una verificación en revisión.", { extensions: { code: "BAD_USER_INPUT" } });
  }
  const tipo = input.documentoTipo.trim().toUpperCase();
  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    throw new GraphQLError("Tipo de documento inválido (CI, NIT o PASAPORTE).", { extensions: { code: "BAD_USER_INPUT" } });
  }
  // documentoUrl guarda el public_id de Cloudinary (asset privado authenticated),
  // no una URL pública. La URL de entrega se firma bajo demanda al leer.
  if (!input.documentoUrl?.trim()) {
    throw new GraphQLError("Debes adjuntar una imagen del documento.", { extensions: { code: "BAD_USER_INPUT" } });
  }
  return prisma.perfilVendedor.update({
    where: { id: perfilVendedorId },
    data: {
      estadoVerificacion:    "PENDIENTE",
      documentoUrl:          input.documentoUrl.trim(),
      documentoTipo:         tipo,
      verificacionEnviadaEn: new Date(),
      verificacionNotas:     null,
    },
    select: PERFIL_VENDEDOR_SELECT,
  });
}

/** El admin aprueba o rechaza una verificación PENDIENTE y notifica al vendedor. */
export async function resolverVerificacion(
  perfilVendedorId: string, aprobar: boolean, notas: string | null, prisma: PrismaClient,
) {
  const perfil = await prisma.perfilVendedor.findUnique({
    where:  { id: perfilVendedorId },
    select: { estadoVerificacion: true, usuarioId: true },
  });
  if (!perfil) {
    throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  if (perfil.estadoVerificacion !== "PENDIENTE") {
    throw new GraphQLError("Esta verificación ya fue resuelta.", { extensions: { code: "BAD_USER_INPUT" } });
  }

  const actualizado = await prisma.perfilVendedor.update({
    where: { id: perfilVendedorId },
    data: {
      estadoVerificacion: aprobar ? "APROBADO" : "RECHAZADO",
      verificado:         aprobar,
      verificacionNotas:  aprobar ? null : (notas?.trim() || "No cumple los requisitos de verificación."),
    },
    select: PERFIL_VENDEDOR_SELECT,
  });

  const n = await prisma.notificacion.create({
    data: {
      usuarioId: perfil.usuarioId,
      tipo:      aprobar ? "VERIFICACION_APROBADA" : "VERIFICACION_RECHAZADA",
      titulo:    aprobar ? "¡Tienda verificada!" : "Verificación rechazada",
      mensaje:   aprobar
        ? "Tu identidad fue verificada. Ya puedes retirar fondos y luces el sello de confianza."
        : `Tu verificación fue rechazada.${notas?.trim() ? ` Motivo: ${notas.trim()}` : ""} Puedes volver a enviarla.`,
      url: "/vendedor/verificacion",
    },
  });
  try {
    publishNotificacion(perfil.usuarioId, {
      id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
      leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
    });
  } catch { /* pub/sub best-effort (Redis puede no estar disponible) */ }

  return actualizado;
}

/** Cola de verificaciones PENDIENTES para el panel admin. */
export async function getVerificacionesPendientes(prisma: PrismaClient) {
  const rows = await prisma.perfilVendedor.findMany({
    where:   { estadoVerificacion: "PENDIENTE" },
    orderBy: { verificacionEnviadaEn: "asc" },
    select: {
      id: true, nombreNegocio: true, ciudad: true, documentoUrl: true, documentoTipo: true,
      verificacionEnviadaEn: true, telefono: true,
      usuario: { select: { email: true } },
    },
  });
  return rows.map((r) => ({
    id:            r.id,
    nombreNegocio: r.nombreNegocio,
    ciudad:        r.ciudad,
    email:         r.usuario?.email ?? "",
    telefono:      r.telefono,
    documentoUrl:  urlFirmadaKyc(r.documentoUrl), // URL firmada efímera (privada)
    documentoTipo: r.documentoTipo,
    enviadaEn:     r.verificacionEnviadaEn?.toISOString() ?? null,
  }));
}

// ── Planes de vendedor (H.2) ─────────────────────────────────────────────────────

export async function mejorarPlan(perfilVendedorId: string, plan: string, prisma: PrismaClient) {
  if (plan !== "FREE" && plan !== "PRO") {
    throw new GraphQLError("Plan inválido.", { extensions: { code: "BAD_USER_INPUT" } });
  }

  // Modelo de negocio: PRO se PAGA (débito del saldo disponible del vendedor)
  // y dura 30 días; el cron lo degrada a FREE al vencer. Antes el upgrade era
  // gratuito → cualquier vendedor se bajaba la comisión de 10% a 5% sin pagar.
  let planVenceEn: Date | null = null;
  if (plan === "PRO") {
    const precio = new Decimal((await getConfigNumber("precio_plan_pro", prisma)) || 99);
    await saldosService.cobrarSuscripcion(
      perfilVendedorId, precio, `Plan PRO — 30 días (Bs. ${precio.toFixed(2)})`, prisma,
    );
    planVenceEn = new Date(Date.now() + 30 * 86_400_000);
  }

  return prisma.perfilVendedor.update({
    where:  { id: perfilVendedorId },
    data:   { plan, planVenceEn },
    select: {
      id: true, nombreNegocio: true, descripcion: true, ciudad: true, telefono: true,
      logoUrl: true, ratingPromedio: true, totalVentas: true, totalResenias: true, plan: true, planVenceEn: true, verificado: true, usuarioId: true,
    },
  });
}

// ── listarUsuarios (admin) ────────────────────────────────────────────────────

export async function listarUsuarios(prisma: PrismaClient) {
  return repo.findAllUsuarios(prisma);
}
