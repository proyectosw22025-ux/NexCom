import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

import * as repo from "./auth.repository.js";
import { login } from "./auth.service.js";

vi.mock("./auth.repository.js");
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

const prisma = {} as PrismaClient;

const usuarioBase = {
  id: "user-1",
  email: "comprador@nexcom.bo",
  passwordHash: "hashed-password",
  rol: "COMPRADOR" as const,
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

  it("rechaza el login si el email no está verificado", async () => {
    vi.mocked(repo.findUsuarioByEmailConPerfil).mockResolvedValue({
      ...usuarioBase,
      verificado: false,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      login({ email: usuarioBase.email, password: "password123" }, prisma),
    ).rejects.toMatchObject({
      message: "Debes verificar tu email antes de iniciar sesión.",
      extensions: { code: "UNVERIFIED_EMAIL" },
    });
  });
});
