import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { enviarVerificacion, resolverVerificacion } from "./auth.service.js";

vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

function makePrisma(estado: string, over: Record<string, unknown> = {}) {
  return {
    perfilVendedor: {
      findUnique: vi.fn().mockResolvedValue({ estadoVerificacion: estado, usuarioId: "u1" }),
      update:     vi.fn().mockResolvedValue({ id: "v1", estadoVerificacion: estado }),
    },
    notificacion: {
      create: vi.fn().mockResolvedValue({
        id: "n1", tipo: "VERIFICACION_APROBADA", titulo: "t", mensaje: "m",
        leido: false, url: "/vendedor/verificacion", ordenId: null, creadoEn: new Date(),
      }),
    },
    ...over,
  } as unknown as PrismaClient;
}

const doc = { documentoUrl: "https://cloud/img.jpg", documentoTipo: "CI" };

describe("enviarVerificacion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envía cuando el estado es NO_ENVIADO (→ PENDIENTE)", async () => {
    const prisma = makePrisma("NO_ENVIADO");
    await enviarVerificacion("v1", doc, prisma);
    expect(prisma.perfilVendedor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estadoVerificacion: "PENDIENTE", documentoTipo: "CI" }) }),
    );
  });

  it("rechaza reenviar si ya está APROBADO", async () => {
    const prisma = makePrisma("APROBADO");
    await expect(enviarVerificacion("v1", doc, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si ya hay una verificación PENDIENTE", async () => {
    const prisma = makePrisma("PENDIENTE");
    await expect(enviarVerificacion("v1", doc, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza un tipo de documento inválido", async () => {
    const prisma = makePrisma("NO_ENVIADO");
    await expect(enviarVerificacion("v1", { ...doc, documentoTipo: "LICENCIA" }, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si falta la imagen del documento", async () => {
    const prisma = makePrisma("NO_ENVIADO");
    await expect(enviarVerificacion("v1", { ...doc, documentoUrl: "" }, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});

describe("resolverVerificacion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aprueba: marca verificado=true y APROBADO, y notifica", async () => {
    const prisma = makePrisma("PENDIENTE");
    await resolverVerificacion("v1", true, null, prisma);
    expect(prisma.perfilVendedor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estadoVerificacion: "APROBADO", verificado: true }) }),
    );
    expect(prisma.notificacion.create).toHaveBeenCalled();
  });

  it("rechaza con motivo: RECHAZADO + verificado=false + guarda notas", async () => {
    const prisma = makePrisma("PENDIENTE");
    await resolverVerificacion("v1", false, "Documento ilegible", prisma);
    expect(prisma.perfilVendedor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estadoVerificacion: "RECHAZADO", verificado: false, verificacionNotas: "Documento ilegible" }) }),
    );
  });

  it("no permite resolver una verificación que no está PENDIENTE", async () => {
    const prisma = makePrisma("APROBADO");
    await expect(resolverVerificacion("v1", true, null, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
