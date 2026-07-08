import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { ofertasRepository } from "./ofertas.repository.js";
import { ofertasService } from "./ofertas.service.js";

vi.mock("./ofertas.repository.js", () => ({
  ofertasRepository: {
    create:       vi.fn(),
    update:       vi.fn(),
    updateEstado: vi.fn(),
  },
}));

// Prisma stub: solo se usa producto.findMany y oferta.findUnique.
function makePrisma(over: Partial<{
  productosEncontrados: { id: string }[];
  oferta: unknown;
}> = {}) {
  return {
    producto: {
      findMany: vi.fn().mockResolvedValue(over.productosEncontrados ?? []),
    },
    oferta: {
      findUnique: vi.fn().mockResolvedValue(over.oferta ?? null),
    },
  } as unknown as PrismaClient;
}

const inputBase = {
  titulo:      "Descuento verano",
  descripcion: null,
  descuento:   20,
  fechaInicio: "2026-06-01T00:00:00.000Z",
  fechaFin:    "2026-07-01T00:00:00.000Z",
  productoIds: ["p1", "p2"],
};

describe("ofertasService.crear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea la oferta cuando los productos pertenecen al vendedor", async () => {
    const prisma = makePrisma({ productosEncontrados: [{ id: "p1" }, { id: "p2" }] });
    vi.mocked(ofertasRepository.create).mockResolvedValue({ id: "o1" } as never);

    await ofertasService.crear("v1", inputBase, prisma);

    expect(ofertasRepository.create).toHaveBeenCalledWith(
      "v1",
      expect.objectContaining({ titulo: "Descuento verano", descuento: 20 }),
      ["p1", "p2"],
      prisma,
    );
  });

  it("deduplica productoIds repetidos (evita filas puente duplicadas)", async () => {
    const prisma = makePrisma({ productosEncontrados: [{ id: "p1" }] });
    vi.mocked(ofertasRepository.create).mockResolvedValue({ id: "o1" } as never);

    await ofertasService.crear("v1", { ...inputBase, productoIds: ["p1", "p1", "p1"] }, prisma);

    // La consulta de propiedad se hace con ids únicos y create recibe únicos.
    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["p1"] } }) }),
    );
    expect(ofertasRepository.create).toHaveBeenCalledWith("v1", expect.anything(), ["p1"], prisma);
  });

  it("rechaza descuento fuera de 1–100", async () => {
    const prisma = makePrisma();
    await expect(ofertasService.crear("v1", { ...inputBase, descuento: 0 }, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    await expect(ofertasService.crear("v1", { ...inputBase, descuento: 101 }, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si la fecha fin no es posterior al inicio", async () => {
    const prisma = makePrisma();
    await expect(
      ofertasService.crear("v1", { ...inputBase, fechaFin: inputBase.fechaInicio }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si no se incluye ningún producto", async () => {
    const prisma = makePrisma();
    await expect(ofertasService.crear("v1", { ...inputBase, productoIds: [] }, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza productos que no pertenecen al vendedor (FORBIDDEN)", async () => {
    // pide 2 pero solo 1 es suyo/activo
    const prisma = makePrisma({ productosEncontrados: [{ id: "p1" }] });
    await expect(ofertasService.crear("v1", inputBase, prisma))
      .rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
    expect(ofertasRepository.create).not.toHaveBeenCalled();
  });
});

describe("ofertasService.actualizar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza editar una oferta que no es del vendedor", async () => {
    const prisma = makePrisma({ oferta: { vendedorId: "otro", estado: "ACTIVA", fechaInicio: new Date("2026-06-01") } });
    await expect(ofertasService.actualizar("o1", "v1", { titulo: "x" }, prisma))
      .rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
  });

  it("rechaza editar una oferta cancelada o vencida", async () => {
    const prisma = makePrisma({ oferta: { vendedorId: "v1", estado: "VENCIDA", fechaInicio: new Date("2026-06-01") } });
    await expect(ofertasService.actualizar("o1", "v1", { descuento: 30 }, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza fechaFin anterior o igual a la fechaInicio existente", async () => {
    const prisma = makePrisma({ oferta: { vendedorId: "v1", estado: "ACTIVA", fechaInicio: new Date("2026-06-10") } });
    await expect(
      ofertasService.actualizar("o1", "v1", { fechaFin: "2026-06-01T00:00:00.000Z" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("lanza NOT_FOUND si la oferta no existe", async () => {
    const prisma = makePrisma({ oferta: null });
    await expect(ofertasService.actualizar("o1", "v1", { titulo: "x" }, prisma))
      .rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });
});

describe("ofertasService.cancelar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancela una oferta activa propia", async () => {
    const prisma = makePrisma({ oferta: { vendedorId: "v1", estado: "ACTIVA" } });
    vi.mocked(ofertasRepository.updateEstado).mockResolvedValue({ id: "o1", estado: "CANCELADA" } as never);
    await ofertasService.cancelar("o1", "v1", prisma);
    expect(ofertasRepository.updateEstado).toHaveBeenCalledWith("o1", "CANCELADA", prisma);
  });

  it("rechaza cancelar una oferta ajena", async () => {
    const prisma = makePrisma({ oferta: { vendedorId: "otro", estado: "ACTIVA" } });
    await expect(ofertasService.cancelar("o1", "v1", prisma))
      .rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
    expect(ofertasRepository.updateEstado).not.toHaveBeenCalled();
  });

  it("rechaza cancelar una oferta ya finalizada", async () => {
    const prisma = makePrisma({ oferta: { vendedorId: "v1", estado: "CANCELADA" } });
    await expect(ofertasService.cancelar("o1", "v1", prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
