import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";

import { ordenesRepository } from "./ordenes.repository.js";
import { ordenesService } from "./ordenes.service.js";

vi.mock("./ordenes.repository.js", () => ({
  ordenesRepository: {
    findOneByVendedor: vi.fn(),
    avanzarEstado: vi.fn(),
  },
}));

const prisma = {} as PrismaClient;

describe("ordenesService.avanzarEstado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("avanza de PAGADO a EN_PREPARACION (transición válida)", async () => {
    vi.mocked(ordenesRepository.findOneByVendedor).mockResolvedValue({
      id: "orden-1",
      estado: "PAGADO",
    } as never);
    vi.mocked(ordenesRepository.avanzarEstado).mockResolvedValue({
      id: "orden-1",
      estado: "EN_PREPARACION",
    } as never);

    const result = await ordenesService.avanzarEstado(
      "orden-1",
      "vendedor-1",
      "usuario-1",
      "Preparando pedido",
      undefined,
      prisma,
    );

    expect(ordenesRepository.avanzarEstado).toHaveBeenCalledWith(
      "orden-1",
      "PAGADO",            // estadoActual (CAS): solo avanza si sigue en PAGADO
      "EN_PREPARACION",
      "usuario-1",
      "Preparando pedido",
      undefined,
      prisma,
    );
    expect(result).toMatchObject({ estado: "EN_PREPARACION" });
  });

  it("lanza CONFLICT si otro proceso cambió la orden (CAS perdido → no revive)", async () => {
    vi.mocked(ordenesRepository.findOneByVendedor).mockResolvedValue({
      id: "orden-9", estado: "PAGADO",
    } as never);
    // El repositorio devuelve null: la orden ya no estaba en PAGADO (p.ej. se
    // canceló automáticamente por no-envío en paralelo).
    vi.mocked(ordenesRepository.avanzarEstado).mockResolvedValue(null as never);

    await expect(
      ordenesService.avanzarEstado("orden-9", "vendedor-1", "usuario-1", null, undefined, prisma),
    ).rejects.toMatchObject({ extensions: { code: "CONFLICT" } });
  });

  it("avanza de EN_PREPARACION a ENVIADO (transición válida)", async () => {
    vi.mocked(ordenesRepository.findOneByVendedor).mockResolvedValue({
      id: "orden-2",
      estado: "EN_PREPARACION",
    } as never);
    vi.mocked(ordenesRepository.avanzarEstado).mockResolvedValue({
      id: "orden-2",
      estado: "ENVIADO",
    } as never);

    await ordenesService.avanzarEstado(
      "orden-2", "vendedor-1", "usuario-1", null, "https://tracking.bo/abc", prisma,
    );

    expect(ordenesRepository.avanzarEstado).toHaveBeenCalledWith(
      "orden-2",
      "EN_PREPARACION",    // estadoActual (CAS)
      "ENVIADO",
      "usuario-1",
      null,
      "https://tracking.bo/abc",
      prisma,
    );
  });

  it("rechaza transiciones no permitidas (ej. desde ENTREGADO)", async () => {
    vi.mocked(ordenesRepository.findOneByVendedor).mockResolvedValue({
      id: "orden-3",
      estado: "ENTREGADO",
    } as never);

    await expect(
      ordenesService.avanzarEstado("orden-3", "vendedor-1", "usuario-1", null, undefined, prisma),
    ).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });

    expect(ordenesRepository.avanzarEstado).not.toHaveBeenCalled();
  });

  it("lanza NOT_FOUND si la orden no existe o no pertenece al vendedor", async () => {
    vi.mocked(ordenesRepository.findOneByVendedor).mockResolvedValue(null);

    await expect(
      ordenesService.avanzarEstado("orden-x", "vendedor-1", "usuario-1", null, undefined, prisma),
    ).rejects.toMatchObject({
      extensions: { code: "NOT_FOUND" },
    });
  });
});
