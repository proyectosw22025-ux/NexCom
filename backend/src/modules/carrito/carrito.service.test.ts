import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { carritoRepository } from "./carrito.repository.js";
import { carritoService } from "./carrito.service.js";

vi.mock("./carrito.repository.js", () => ({
  carritoRepository: {
    getCarritoId:     vi.fn().mockResolvedValue("cart-1"),
    deleteItem:       vi.fn(),
    guardar:          vi.fn(),
    eliminarGuardado: vi.fn(),
    listarGuardados:  vi.fn(),
    upsertItem:       vi.fn(),
    getOrCreate:      vi.fn().mockResolvedValue({ id: "cart-1", items: [], total: "0", totalItems: 0 }),
  },
}));

const prisma = {} as PrismaClient;

describe("carritoService — guardar para después", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guardarParaDespues: saca del carrito y mete en guardados", async () => {
    await carritoService.guardarParaDespues("c1", "prod-1", prisma);
    expect(carritoRepository.deleteItem).toHaveBeenCalledWith("cart-1", "prod-1", prisma);
    expect(carritoRepository.guardar).toHaveBeenCalledWith("c1", "prod-1", prisma);
  });

  it("quitarGuardado: elimina de guardados", async () => {
    const r = await carritoService.quitarGuardado("c1", "prod-1", prisma);
    expect(carritoRepository.eliminarGuardado).toHaveBeenCalledWith("c1", "prod-1", prisma);
    expect(r).toBe(true);
  });

  it("getGuardados delega en el repositorio", async () => {
    vi.mocked(carritoRepository.listarGuardados).mockResolvedValue([{ id: "prod-1" }] as never);
    const r = await carritoService.getGuardados("c1", prisma);
    expect(r).toEqual([{ id: "prod-1" }]);
  });

  it("moverAlCarrito: quita de guardados y agrega al carrito (valida stock)", async () => {
    const prismaProd = {
      producto:    { findUnique: vi.fn().mockResolvedValue({ id: "prod-1", activo: true, stock: 10, precio: "50" }) },
      itemCarrito: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    await carritoService.moverAlCarrito("c1", "prod-1", prismaProd);

    expect(carritoRepository.eliminarGuardado).toHaveBeenCalledWith("c1", "prod-1", prismaProd);
    expect(carritoRepository.upsertItem).toHaveBeenCalled(); // se agregó al carrito
  });

  it("moverAlCarrito: rechaza si el producto ya no está activo", async () => {
    const prismaProd = {
      producto: { findUnique: vi.fn().mockResolvedValue({ id: "prod-1", activo: false, stock: 0, precio: "50" }) },
    } as unknown as PrismaClient;

    await expect(
      carritoService.moverAlCarrito("c1", "prod-1", prismaProd),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });
});
