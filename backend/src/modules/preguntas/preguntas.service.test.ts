import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { preguntasRepository } from "./preguntas.repository.js";
import { preguntasService } from "./preguntas.service.js";

vi.mock("./preguntas.repository.js", () => ({
  preguntasRepository: {
    findByProducto:      vi.fn(),
    create:              vi.fn(),
    findByIdConVendedor: vi.fn(),
    responder:           vi.fn(),
  },
}));

const productoFindUnique = vi.fn();
const prisma = { producto: { findUnique: productoFindUnique } } as unknown as PrismaClient;

describe("preguntasService.crear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea la pregunta cuando el producto existe y el texto es válido", async () => {
    productoFindUnique.mockResolvedValue({ id: "prod-1" });
    vi.mocked(preguntasRepository.create).mockResolvedValue({ id: "q1" } as never);

    await preguntasService.crear("prod-1", "user-1", "¿Tiene garantía el producto?", prisma);

    expect(preguntasRepository.create).toHaveBeenCalledWith(
      "prod-1", "user-1", "¿Tiene garantía el producto?", prisma,
    );
  });

  it("rechaza preguntas demasiado cortas", async () => {
    await expect(
      preguntasService.crear("prod-1", "user-1", "hi", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(preguntasRepository.create).not.toHaveBeenCalled();
  });

  it("lanza NOT_FOUND si el producto no existe", async () => {
    productoFindUnique.mockResolvedValue(null);
    await expect(
      preguntasService.crear("prod-x", "user-1", "¿Está disponible aún?", prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });
});

describe("preguntasService.responder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite al vendedor dueño responder", async () => {
    vi.mocked(preguntasRepository.findByIdConVendedor).mockResolvedValue({
      id: "q1", producto: { vendedorId: "vendedor-1" },
    } as never);
    vi.mocked(preguntasRepository.responder).mockResolvedValue({ id: "q1" } as never);

    await preguntasService.responder("q1", "vendedor-1", "Sí, tiene 6 meses de garantía.", prisma);

    expect(preguntasRepository.responder).toHaveBeenCalledWith("q1", "Sí, tiene 6 meses de garantía.", prisma);
  });

  it("rechaza responder preguntas de productos de otra tienda (FORBIDDEN)", async () => {
    vi.mocked(preguntasRepository.findByIdConVendedor).mockResolvedValue({
      id: "q1", producto: { vendedorId: "otro-vendedor" },
    } as never);

    await expect(
      preguntasService.responder("q1", "vendedor-1", "Respuesta", prisma),
    ).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
    expect(preguntasRepository.responder).not.toHaveBeenCalled();
  });

  it("rechaza respuesta vacía", async () => {
    await expect(
      preguntasService.responder("q1", "vendedor-1", "   ", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
