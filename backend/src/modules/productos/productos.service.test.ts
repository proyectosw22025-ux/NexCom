import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { productosRepository } from "./productos.repository.js";
import { productosService } from "./productos.service.js";

vi.mock("./productos.repository.js", () => ({
  productosRepository: {
    findById:        vi.fn(),
    toggleDestacado: vi.fn(),
  },
}));
// Evita interacción con Redis en los tests
vi.mock("../../shared/cache.util.js", () => ({
  getFromCache:      vi.fn(),
  setCache:          vi.fn(),
  deleteCache:       vi.fn(),
  invalidatePattern: vi.fn(),
  getOrSetCache:     vi.fn(),
  CacheKeys:         { producto: () => "k" },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

const perfilFindUnique = vi.fn();
const productoCount    = vi.fn();
const prisma = {
  perfilVendedor: { findUnique: perfilFindUnique },
  producto:       { count: productoCount },
} as unknown as PrismaClient;

describe("productosService.destacarMiProducto (H.3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza a un vendedor FREE (beneficio PRO)", async () => {
    vi.mocked(productosRepository.findById).mockResolvedValue({ id: "p1", vendedorId: "v1", destacado: false } as never);
    perfilFindUnique.mockResolvedValue({ plan: "FREE" });

    await expect(
      productosService.destacarMiProducto("p1", "v1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
    expect(productosRepository.toggleDestacado).not.toHaveBeenCalled();
  });

  it("permite a un PRO destacar si está bajo el tope", async () => {
    vi.mocked(productosRepository.findById).mockResolvedValue({ id: "p1", vendedorId: "v1", destacado: false } as never);
    perfilFindUnique.mockResolvedValue({ plan: "PRO" });
    productoCount.mockResolvedValue(1); // 1 destacado < tope 3
    vi.mocked(productosRepository.toggleDestacado).mockResolvedValue({ id: "p1", destacado: true } as never);

    await productosService.destacarMiProducto("p1", "v1", prisma);
    expect(productosRepository.toggleDestacado).toHaveBeenCalledWith("p1", prisma);
  });

  it("rechaza a un PRO que ya alcanzó el tope de destacados", async () => {
    vi.mocked(productosRepository.findById).mockResolvedValue({ id: "p1", vendedorId: "v1", destacado: false } as never);
    perfilFindUnique.mockResolvedValue({ plan: "PRO" });
    productoCount.mockResolvedValue(3); // ya en el tope

    await expect(
      productosService.destacarMiProducto("p1", "v1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
    expect(productosRepository.toggleDestacado).not.toHaveBeenCalled();
  });

  it("permite a un PRO quitar el destaque sin chequear el tope", async () => {
    vi.mocked(productosRepository.findById).mockResolvedValue({ id: "p1", vendedorId: "v1", destacado: true } as never);
    perfilFindUnique.mockResolvedValue({ plan: "PRO" });
    vi.mocked(productosRepository.toggleDestacado).mockResolvedValue({ id: "p1", destacado: false } as never);

    await productosService.destacarMiProducto("p1", "v1", prisma);
    expect(productoCount).not.toHaveBeenCalled(); // no se valida tope al desactivar
    expect(productosRepository.toggleDestacado).toHaveBeenCalled();
  });

  it("rechaza destacar un producto de otra tienda", async () => {
    vi.mocked(productosRepository.findById).mockResolvedValue({ id: "p1", vendedorId: "otro", destacado: false } as never);

    await expect(
      productosService.destacarMiProducto("p1", "v1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
  });
});
