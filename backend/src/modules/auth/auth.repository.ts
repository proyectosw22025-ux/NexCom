import type { PrismaClient, Usuario, RefreshToken, TokenVerificacion } from "@prisma/client";

// ── Usuarios ──────────────────────────────────────────────────────────────────

export async function findUsuarioByEmail(
  email: string,
  prisma: PrismaClient
): Promise<Usuario | null> {
  return prisma.usuario.findUnique({
    where: { email },
  });
}

export async function findUsuarioByEmailConPerfil(email: string, prisma: PrismaClient) {
  return prisma.usuario.findUnique({
    where: { email },
    include: {
      perfilVendedor:  true,
      perfilComprador: true,
    },
  });
}

export async function findUsuarioById(
  id: string,
  prisma: PrismaClient
): Promise<Usuario | null> {
  return prisma.usuario.findUnique({ where: { id } });
}

export async function findAllUsuarios(prisma: PrismaClient) {
  return prisma.usuario.findMany({
    include: { perfilVendedor: true, perfilComprador: true },
    orderBy: { creadoEn: "desc" },
  });
}

export async function findUsuarioConPerfil(id: string, prisma: PrismaClient) {
  return prisma.usuario.findUnique({
    where: { id },
    include: {
      perfilVendedor:  true,
      perfilComprador: true,
    },
  });
}

export async function markUsuarioVerificado(
  usuarioId: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data:  { verificado: true },
  });
}

export async function updatePasswordHash(
  usuarioId: string,
  passwordHash: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data:  { passwordHash },
  });
}

// ── Registro con perfil (transacción atómica) ─────────────────────────────────

interface CreateUsuarioData {
  email:        string;
  passwordHash: string;
  rol:          "VENDEDOR" | "COMPRADOR";
  verificado?:  boolean; // true mientras la verificación por correo está desactivada
  datosVendedor?: {
    nombreNegocio: string;
    descripcion?:  string;
    telefono?:     string;
    ciudad?:       string;
  };
  datosComprador?: {
    nombreCompleto: string;
    telefono?:      string;
  };
}

export async function createUsuarioConPerfil(
  data: CreateUsuarioData,
  prisma: PrismaClient
) {
  return prisma.$transaction(async (tx) => {
    // Un solo INSERT anidado (usuario + perfil): menos viajes a la BD que crear
    // por separado, y devuelve los perfiles ya incluidos (evita re-consultar).
    return tx.usuario.create({
      data: {
        email:        data.email,
        passwordHash: data.passwordHash,
        rol:          data.rol,
        verificado:   data.verificado ?? false,
        ...(data.rol === "VENDEDOR" && data.datosVendedor
          ? {
              perfilVendedor: {
                create: {
                  nombreNegocio: data.datosVendedor.nombreNegocio,
                  descripcion:   data.datosVendedor.descripcion,
                  telefono:      data.datosVendedor.telefono,
                  ciudad:        data.datosVendedor.ciudad ?? "Santa Cruz",
                },
              },
            }
          : {}),
        ...(data.rol === "COMPRADOR" && data.datosComprador
          ? {
              perfilComprador: {
                create: {
                  nombreCompleto: data.datosComprador.nombreCompleto,
                  telefono:       data.datosComprador.telefono,
                },
              },
            }
          : {}),
      },
      include: { perfilVendedor: true, perfilComprador: true },
    });
  });
}

// ── Tokens de verificación ────────────────────────────────────────────────────

export async function createTokenVerificacion(
  data: { usuarioId: string; token: string; tipo: string; expiraEn: Date },
  prisma: PrismaClient
): Promise<TokenVerificacion> {
  return prisma.tokenVerificacion.create({ data });
}

export async function findTokenVerificacion(
  token: string,
  tipo: string,
  prisma: PrismaClient
): Promise<TokenVerificacion | null> {
  return prisma.tokenVerificacion.findFirst({
    where: { token, tipo, usado: false },
  });
}

export async function markTokenUsado(
  id: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.tokenVerificacion.update({
    where: { id },
    data:  { usado: true },
  });
}

// ── Refresh Tokens ────────────────────────────────────────────────────────────

export async function saveRefreshToken(
  data: { usuarioId: string; tokenHash: string; expiraEn: Date; dispositivo?: string },
  prisma: PrismaClient
): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data });
}

export async function findRefreshTokenByHash(
  tokenHash: string,
  prisma: PrismaClient
): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export async function revokeRefreshToken(
  id: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.refreshToken.update({
    where: { id },
    data:  { revocado: true },
  });
}

export async function revokeAllRefreshTokensUsuario(
  usuarioId: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { usuarioId, revocado: false },
    data:  { revocado: true },
  });
}
