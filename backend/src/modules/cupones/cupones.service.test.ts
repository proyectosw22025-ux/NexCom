import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { cuponesRepository } from "./cupones.repository.js";
import { cuponesService } from "./cupones.service.js";

vi.mock("./cupones.repository.js", () => ({
  cuponesRepository: {
    findByCodigo:         vi.fn(),
    create:               vi.fn(),
    countUsosPorUsuario:  vi.fn(),
    findByVendedor:       vi.fn(),
  },
}));

const prisma = {} as PrismaClient;

const inputBase = {
  codigo: "promo10",
  tipo: "PORCENTAJE",
  valor: 10,
  montoMinimo: null,
  maxUsos: null,
  fechaInicio: "2026-01-01T00:00:00.000Z",
  fechaFin:    "2030-01-01T00:00:00.000Z",
};

describe("cuponesService.crear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea un cupón de vendedor con su vendedorId (scope a la tienda)", async () => {
    vi.mocked(cuponesRepository.findByCodigo).mockResolvedValue(null);
    vi.mocked(cuponesRepository.create).mockResolvedValue({ id: "c1" } as never);

    await cuponesService.crear(inputBase, prisma, "vendedor-1");

    expect(cuponesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: "PROMO10", vendedorId: "vendedor-1" }),
      prisma,
    );
  });

  it("crea un cupón global (admin) con vendedorId null", async () => {
    vi.mocked(cuponesRepository.findByCodigo).mockResolvedValue(null);
    vi.mocked(cuponesRepository.create).mockResolvedValue({ id: "c1" } as never);

    await cuponesService.crear(inputBase, prisma, null);

    expect(cuponesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ vendedorId: null }),
      prisma,
    );
  });

  it("rechaza un porcentaje mayor a 100", async () => {
    await expect(
      cuponesService.crear({ ...inputBase, valor: 150 }, prisma, "vendedor-1"),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza un código duplicado", async () => {
    vi.mocked(cuponesRepository.findByCodigo).mockResolvedValue({ id: "existe" } as never);
    await expect(
      cuponesService.crear(inputBase, prisma, "vendedor-1"),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});

describe("cuponesService.validar", () => {
  beforeEach(() => vi.clearAllMocks());

  const cuponVendedor = {
    id: "c1", codigo: "PROMO10", tipo: "PORCENTAJE", valor: 10,
    montoMinimo: null, maxUsos: null, usosActuales: 0, activo: true,
    vendedorId: "vendedor-1",
    fechaInicio: new Date("2026-01-01"), fechaFin: new Date("2030-01-01"),
  };

  it("calcula el descuento y expone el scope del cupón (vendedorIdCupon)", async () => {
    vi.mocked(cuponesRepository.findByCodigo).mockResolvedValue(cuponVendedor as never);
    vi.mocked(cuponesRepository.countUsosPorUsuario).mockResolvedValue(0);

    const r = await cuponesService.validar("PROMO10", "200", "user-1", prisma);

    expect(r.descuento).toBe("20");                 // 10% de 200
    expect(r.vendedorIdCupon).toBe("vendedor-1");   // scope para que el checkout lo verifique
  });

  it("rechaza un cupón inactivo", async () => {
    vi.mocked(cuponesRepository.findByCodigo).mockResolvedValue({ ...cuponVendedor, activo: false } as never);
    await expect(
      cuponesService.validar("PROMO10", "200", "user-1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si el usuario ya usó el cupón", async () => {
    vi.mocked(cuponesRepository.findByCodigo).mockResolvedValue(cuponVendedor as never);
    vi.mocked(cuponesRepository.countUsosPorUsuario).mockResolvedValue(1);
    await expect(
      cuponesService.validar("PROMO10", "200", "user-1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
