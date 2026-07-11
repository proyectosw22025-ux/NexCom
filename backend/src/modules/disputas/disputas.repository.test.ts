import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { disputasRepository } from "./disputas.repository.js";

function makeTx(casCount: number) {
  const productoUpdate = vi.fn().mockResolvedValue({});
  const ordenUpdate = vi.fn().mockResolvedValue({});
  const tx = {
    disputa: {
      updateMany: vi.fn().mockResolvedValue({ count: casCount }),
      findUnique: vi.fn().mockResolvedValue({ id: "disp-1", estado: "RESUELTA_COMPRADOR" }),
    },
    orden: { update: ordenUpdate },
    historialEstadoOrden: { create: vi.fn().mockResolvedValue({}) },
    producto: { update: productoUpdate },
  };
  return { tx, productoUpdate, ordenUpdate };
}

describe("disputasRepository.resolverReembolso (CAS anti doble restock)", () => {
  beforeEach(() => vi.clearAllMocks());

  const items = [{ productoId: "p1", cantidad: 3 }];

  function prismaWith(tx: unknown) {
    return {
      orden: { findUniqueOrThrow: vi.fn().mockResolvedValue({ estado: "ENVIADO" }) },
      $transaction: (fn: (t: unknown) => unknown) => fn(tx),
    } as unknown as PrismaClient;
  }

  it("cancela la orden y repone stock cuando gana (count=1)", async () => {
    const { tx, productoUpdate, ordenUpdate } = makeTx(1);
    await disputasRepository.resolverReembolso("disp-1", "orden-1", "admin-1", "nota", items, prismaWith(tx));

    expect(tx.disputa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "disp-1", estado: "ABIERTA" } }),
    );
    expect(ordenUpdate).toHaveBeenCalledTimes(1);
    expect(productoUpdate).toHaveBeenCalledTimes(1);
  });

  it("NO cancela ni repone stock cuando otra pasada ya la resolvió (count=0)", async () => {
    const { tx, productoUpdate, ordenUpdate } = makeTx(0);
    await disputasRepository.resolverReembolso("disp-1", "orden-1", "admin-1", "nota", items, prismaWith(tx));

    expect(ordenUpdate).not.toHaveBeenCalled();
    expect(productoUpdate).not.toHaveBeenCalled();
  });
});
