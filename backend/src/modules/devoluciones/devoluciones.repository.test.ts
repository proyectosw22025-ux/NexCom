import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { devolucionesRepository } from "./devoluciones.repository.js";

// tx simulado: capturamos las llamadas para verificar el restock condicional
function makeTx(casCount: number) {
  const productoUpdate = vi.fn().mockResolvedValue({});
  const tx = {
    devolucion: {
      updateMany: vi.fn().mockResolvedValue({ count: casCount }),
      findUnique: vi.fn().mockResolvedValue({ id: "dev-1", estado: "REEMBOLSADA" }),
    },
    producto: { update: productoUpdate },
  };
  return { tx, productoUpdate };
}

describe("devolucionesRepository.reembolsar (CAS anti doble restock)", () => {
  beforeEach(() => vi.clearAllMocks());

  const items = [{ productoId: "p1", cantidad: 2 }, { productoId: "p2", cantidad: 1 }];

  it("repone stock cuando gana la transición (count=1)", async () => {
    const { tx, productoUpdate } = makeTx(1);
    const prisma = { $transaction: (fn: (t: unknown) => unknown) => fn(tx) } as unknown as PrismaClient;

    await devolucionesRepository.reembolsar("dev-1", "ok", items, prisma);

    expect(tx.devolucion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "dev-1", estado: "SOLICITADA" } }),
    );
    expect(productoUpdate).toHaveBeenCalledTimes(2); // un increment por ítem
  });

  it("NO repone stock cuando otra pasada ya la resolvió (count=0)", async () => {
    const { tx, productoUpdate } = makeTx(0);
    const prisma = { $transaction: (fn: (t: unknown) => unknown) => fn(tx) } as unknown as PrismaClient;

    await devolucionesRepository.reembolsar("dev-1", "ok", items, prisma);

    expect(productoUpdate).not.toHaveBeenCalled(); // sin doble restock
  });
});
