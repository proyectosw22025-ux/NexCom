import { describe, it, expect, vi } from "vitest";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { pagosRepository } from "./pagos.repository.js";

/**
 * Construye un prisma mock cuyo $transaction ejecuta el callback con un `tx`
 * falso. `updateManyCount` controla cuántas filas afecta el decremento de stock
 * (0 = se agotó por otra compra concurrente).
 */
function prismaMock(updateManyCount: number) {
  const tx = {
    orden:                { create: vi.fn().mockResolvedValue({ id: "orden-1" }) },
    pago:                 { create: vi.fn().mockResolvedValue({}) },
    producto:             { updateMany: vi.fn().mockResolvedValue({ count: updateManyCount }) },
    historialEstadoOrden: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
  } as unknown as PrismaClient;
  return { prisma, tx };
}

const baseData = {
  compradorId: "c1", vendedorId: "v1", direccionId: "d1", direccionSnapshot: {},
  subtotal: new Decimal(50), descuentoCupon: new Decimal(0), total: new Decimal(50),
  items: [{ productoId: "p1", nombreSnapshot: "Producto", cantidad: 1, precioUnitario: new Decimal(50) }],
};

describe("pagosRepository.crearOrdenConItems — guard anti-sobreventa", () => {
  it("usa un decremento condicional (WHERE stock >= cantidad)", async () => {
    const { prisma, tx } = prismaMock(1);
    await pagosRepository.crearOrdenConItems(baseData, prisma);
    expect(tx.producto.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", stock: { gte: 1 } },
      data:  { stock: { decrement: 1 } },
    });
  });

  it("revierte (lanza BAD_USER_INPUT) si el stock se agotó (count 0)", async () => {
    const { prisma } = prismaMock(0);
    await expect(pagosRepository.crearOrdenConItems(baseData, prisma))
      .rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("crea la orden cuando hay stock (count 1)", async () => {
    const { prisma } = prismaMock(1);
    const orden = await pagosRepository.crearOrdenConItems(baseData, prisma);
    expect(orden).toMatchObject({ id: "orden-1" });
  });
});
