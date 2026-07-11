import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

import * as repo from "./auth.repository.js";
import { login } from "./auth.service.js";

vi.mock("./auth.repository.js");
vi.mock("bcryptjs", () => ({
  default: {
    compare:   vi.fn(),
    hash:      vi.fn(),
    getRounds: vi.fn(() => 10), // por defecto: hash ya en el costo objetivo
  },
}));

const prisma = {} as PrismaClient;

const usuarioBase = {
  id: "user-1",
  email: "comprador@nexcom.bo",
  passwordHash: "hashed-password",
  rol: "CLIENTE" as const,
  activo: true,
  verificado: true,
};

describe("auth.service.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna access/refresh token cuando las credenciales son correctas", async () => {
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue({
      ...usuarioBase,
      perfilVendedor: null,
      perfilComprador: { id: "perfil-1" },
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(repo.saveRefreshToken).mockResolvedValue({} as never);

    const result = await login(
      { email: "comprador@nexcom.bo", password: "password123" },
      prisma,
    );

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(repo.saveRefreshToken).toHaveBeenCalledTimes(1);
    // hash ya está en el costo objetivo → no se re-hashea
    expect(repo.updatePasswordHash).not.toHaveBeenCalled();
  });

  it("re-hashea la contraseña al iniciar sesión si el hash usa un costo viejo", async () => {
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue({
      ...usuarioBase,
      perfilVendedor: null,
      perfilComprador: { id: "perfil-1" },
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.getRounds).mockReturnValue(12); // hash viejo (cost 12)
    vi.mocked(bcrypt.hash).mockResolvedValue("hash-nuevo-cost-10" as never);
    vi.mocked(repo.saveRefreshToken).mockResolvedValue({} as never);
    vi.mocked(repo.updatePasswordHash).mockResolvedValue(undefined as never);

    await login({ email: "comprador@nexcom.bo", password: "password123" }, prisma);

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(repo.updatePasswordHash).toHaveBeenCalledWith("user-1", "hash-nuevo-cost-10", prisma);
  });

  it("rechaza credenciales cuando el usuario no existe", async () => {
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue(null);

    await expect(
      login({ email: "noexiste@nexcom.bo", password: "password123" }, prisma),
    ).rejects.toMatchObject({
      message: "Credenciales incorrectas.",
      extensions: { code: "BAD_USER_INPUT" },
    });
  });

  it("rechaza credenciales cuando la contraseña no coincide", async () => {
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue(usuarioBase as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      login({ email: usuarioBase.email, password: "incorrecta1" }, prisma),
    ).rejects.toMatchObject({
      message: "Credenciales incorrectas.",
      extensions: { code: "BAD_USER_INPUT" },
    });
  });

  it("rechaza el login si la cuenta está desactivada", async () => {
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue({
      ...usuarioBase,
      activo: false,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      login({ email: usuarioBase.email, password: "password123" }, prisma),
    ).rejects.toMatchObject({
      message: "Tu cuenta ha sido desactivada. Contacta soporte.",
      extensions: { code: "FORBIDDEN" },
    });
  });

  it("permite el login sin email verificado (verificación por correo desactivada)", async () => {
    // Mientras VERIFICACION_EMAIL_ACTIVA sea false (sin SMTP en producción),
    // las cuentas no verificadas deben poder iniciar sesión con normalidad.
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue({
      ...usuarioBase,
      verificado: false,
      perfilVendedor: null,
      perfilComprador: { id: "perfil-1" },
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(repo.saveRefreshToken).mockResolvedValue({} as never);

    const r = await login({ email: usuarioBase.email, password: "password123" }, prisma);
    expect(r.accessToken).toEqual(expect.any(String));
  });
});
