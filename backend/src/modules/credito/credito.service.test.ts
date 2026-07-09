import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import { creditoRepository } from "./credito.repository.js";
import { creditoService } from "./credito.service.js";

vi.mock("./credito.repository.js", () => ({
  creditoRepository: {
    sumarPorTipo:     vi.fn(),
    existeMovimiento: vi.fn(),
    crear:            vi.fn(),
    listar:           vi.fn(),
  },
}));

const prisma = {} as PrismaClient;

function saldos(reembolso: string, uso: string, retiro: string) {
  vi.mocked(creditoRepository.sumarPorTipo).mockImplementation(async (_c, tipo) =>
    new Decimal(tipo === "REEMBOLSO" ? reembolso : tipo === "USO" ? uso : retiro),
  );
}

describe("creditoService.getDisponible", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disponible = REEMBOLSO − USO − RETIRO", async () => {
    saldos("200", "50", "30");
    const d = await creditoService.getDisponible("c1", prisma);
    expect(d.toString()).toBe("120");
  });
});

describe("creditoService.acreditarReembolso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acredita el reembolso a la billetera", async () => {
    vi.mocked(creditoRepository.existeMovimiento).mockResolvedValue(false);
    await creditoService.acreditarReembolso("c1", "orden-1", new Decimal("150"), prisma);
    expect(creditoRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "REEMBOLSO", monto: expect.anything(), ordenId: "orden-1" }), prisma,
    );
  });

  it("es idempotente: no acredita dos veces la misma orden", async () => {
    vi.mocked(creditoRepository.existeMovimiento).mockResolvedValue(true);
    await creditoService.acreditarReembolso("c1", "orden-1", new Decimal("150"), prisma);
    expect(creditoRepository.crear).not.toHaveBeenCalled();
  });

  it("ignora montos no positivos", async () => {
    await creditoService.acreditarReembolso("c1", "orden-1", new Decimal("0"), prisma);
    expect(creditoRepository.crear).not.toHaveBeenCalled();
  });
});

describe("creditoService.cotizarUso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no aplica más crédito que el saldo disponible", async () => {
    saldos("50", "0", "0"); // disponible 50
    const usar = await creditoService.cotizarUso("c1", new Decimal("120"), prisma);
    expect(usar.toString()).toBe("50");
  });

  it("no aplica más crédito que la base de la compra", async () => {
    saldos("500", "0", "0"); // disponible 500
    const usar = await creditoService.cotizarUso("c1", new Decimal("80"), prisma);
    expect(usar.toString()).toBe("80");
  });
});
