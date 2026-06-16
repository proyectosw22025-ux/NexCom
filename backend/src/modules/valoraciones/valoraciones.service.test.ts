import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { valoracionesRepository } from "./valoraciones.repository.js";
import { valoracionesService } from "./valoraciones.service.js";

vi.mock("./valoraciones.repository.js", () => ({
  valoracionesRepository: {
    findByOrden: vi.fn(),
    create:      vi.fn(),
    responder:   vi.fn(),
  },
}));

// Prisma mockeado: solo los métodos que el service usa directamente
const ordenFindFirst       = vi.fn();
const valoracionFindUnique = vi.fn();
const prisma = {
  orden:      { findFirst: ordenFindFirst },
  valoracion: { findUnique: valoracionFindUnique },
} as unknown as PrismaClient;

const ordenEntregada = {
  id: "orden-1", compradorId: "comprador-1", vendedorId: "vendedor-1", estado: "ENTREGADO",
};

describe("valoracionesService.crear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea la valoración cuando la orden está ENTREGADO y no fue valorada", async () => {
    ordenFindFirst.mockResolvedValue(ordenEntregada);
    vi.mocked(valoracionesRepository.findByOrden).mockResolvedValue(null);
    vi.mocked(valoracionesRepository.create).mockResolvedValue({ id: "val-1" } as never);

    const result = await valoracionesService.crear(
      "comprador-1",
      { ordenId: "orden-1", calificacion: 5, comentario: "Excelente" },
      prisma,
    );

    expect(valoracionesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ordenId: "orden-1", compradorId: "comprador-1", vendedorId: "vendedor-1", calificacion: 5,
      }),
      prisma,
    );
    expect(result).toMatchObject({ id: "val-1" });
  });

  it("rechaza calificaciones fuera del rango 1-5", async () => {
    await expect(
      valoracionesService.crear("comprador-1", { ordenId: "orden-1", calificacion: 6 }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });

    expect(ordenFindFirst).not.toHaveBeenCalled();
  });

  it("lanza NOT_FOUND si la orden no pertenece al comprador", async () => {
    ordenFindFirst.mockResolvedValue(null);

    await expect(
      valoracionesService.crear("comprador-1", { ordenId: "orden-x", calificacion: 4 }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });

  it("rechaza valorar una orden que no está ENTREGADO", async () => {
    ordenFindFirst.mockResolvedValue({ ...ordenEntregada, estado: "ENVIADO" });

    await expect(
      valoracionesService.crear("comprador-1", { ordenId: "orden-1", calificacion: 4 }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza una segunda valoración de la misma orden", async () => {
    ordenFindFirst.mockResolvedValue(ordenEntregada);
    vi.mocked(valoracionesRepository.findByOrden).mockResolvedValue({ id: "val-previa" } as never);

    await expect(
      valoracionesService.crear("comprador-1", { ordenId: "orden-1", calificacion: 4 }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });

    expect(valoracionesRepository.create).not.toHaveBeenCalled();
  });
});

describe("valoracionesService.responder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite al vendedor responder su valoración", async () => {
    valoracionFindUnique.mockResolvedValue({ id: "val-1", vendedorId: "vendedor-1" });
    vi.mocked(valoracionesRepository.responder).mockResolvedValue({ id: "val-1" } as never);

    await valoracionesService.responder("val-1", "vendedor-1", "¡Gracias por tu compra!", prisma);

    expect(valoracionesRepository.responder).toHaveBeenCalledWith(
      "val-1", "vendedor-1", "¡Gracias por tu compra!", prisma,
    );
  });

  it("rechaza una respuesta vacía", async () => {
    await expect(
      valoracionesService.responder("val-1", "vendedor-1", "   ", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });

    expect(valoracionFindUnique).not.toHaveBeenCalled();
  });

  it("lanza NOT_FOUND si la valoración es de otro vendedor", async () => {
    valoracionFindUnique.mockResolvedValue({ id: "val-1", vendedorId: "otro-vendedor" });

    await expect(
      valoracionesService.responder("val-1", "vendedor-1", "Respuesta", prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });

    expect(valoracionesRepository.responder).not.toHaveBeenCalled();
  });
});
