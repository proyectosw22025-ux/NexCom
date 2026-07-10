import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import { creditoRepository } from "./credito.repository.js";
import { creditoService } from "./credito.service.js";

vi.mock("./credito.repository.js", () => ({
  creditoRepository: {
    sumarPorTipo:     vi.fn(),
    sumarRetiros:     vi.fn(),
    existeMovimiento: vi.fn(),
    crear:            vi.fn(),
    listar:           vi.fn(),
    crearRetiro:      vi.fn(),
    findRetiro:       vi.fn(),
    actualizarRetiro: vi.fn(),
  },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

// Stub con $transaction pass-through (registrarUso es atómico) y $executeRaw
// no-op (advisory lock). tx === prisma para que las aserciones sobre los mocks
// del repositorio sigan recibiendo el mismo objeto.
const prisma = {
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  $executeRaw:  async () => 0,
} as unknown as PrismaClient;

// reembolso/uso vienen del ledger (sumarPorTipo); retiros activos vienen de la
// tabla de retiros (sumarRetiros PENDIENTE+PAGADO).
function saldos(reembolso: string, uso: string, retiros: string) {
  vi.mocked(creditoRepository.sumarPorTipo).mockImplementation(async (_c, tipo) =>
    new Decimal(tipo === "REEMBOLSO" ? reembolso : uso),
  );
  vi.mocked(creditoRepository.sumarRetiros).mockResolvedValue(new Decimal(retiros));
}

describe("creditoService.getDisponible", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disponible = REEMBOLSO − USO − retiros activos (reserva pendientes)", async () => {
    saldos("200", "50", "30");
    const d = await creditoService.getDisponible("c1", prisma);
    expect(d.toString()).toBe("120");
  });
});

describe("creditoService.solicitarRetiro", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea el retiro cuando el monto está dentro del disponible", async () => {
    saldos("300", "0", "0"); // disponible 300
    vi.mocked(creditoRepository.crearRetiro).mockResolvedValue({
      id: "r1", monto: "100", estado: "PENDIENTE", banco: "BNB", numeroCuenta: "123", titular: "Ana", creadoEn: new Date(),
    } as never);
    const r = await creditoService.solicitarRetiro("c1", { monto: "100", banco: "BNB", numeroCuenta: "123", titular: "Ana" }, prisma);
    expect(r).toMatchObject({ estado: "PENDIENTE", monto: "100.00" });
  });

  it("rechaza retirar más que el saldo disponible", async () => {
    saldos("50", "0", "0"); // disponible 50
    await expect(
      creditoService.solicitarRetiro("c1", { monto: "100", banco: "BNB", numeroCuenta: "1", titular: "Ana" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(creditoRepository.crearRetiro).not.toHaveBeenCalled();
  });

  it("rechaza montos por debajo del mínimo", async () => {
    saldos("1000", "0", "0");
    await expect(
      creditoService.solicitarRetiro("c1", { monto: "5", banco: "BNB", numeroCuenta: "1", titular: "Ana" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
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

describe("creditoService.registrarUso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("debita el crédito usado (movimiento USO) cuando hay saldo", async () => {
    vi.mocked(creditoRepository.existeMovimiento).mockResolvedValue(false);
    saldos("100", "0", "0"); // disponible 100 ≥ 30
    await creditoService.registrarUso("c1", "orden-1", new Decimal("30"), prisma);
    expect(creditoRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "USO", ordenId: "orden-1" }), prisma,
    );
  });

  it("CAPA el débito al saldo disponible (nunca deja la billetera negativa)", async () => {
    vi.mocked(creditoRepository.existeMovimiento).mockResolvedValue(false);
    saldos("20", "0", "0"); // disponible 20 < 50 pedido
    const real = await creditoService.registrarUso("c1", "orden-1", new Decimal("50"), prisma);
    expect(real.toString()).toBe("20");
    expect(creditoRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "USO", monto: expect.anything() }), prisma,
    );
  });

  it("es idempotente por orden (no debita dos veces)", async () => {
    vi.mocked(creditoRepository.existeMovimiento).mockResolvedValue(true);
    await creditoService.registrarUso("c1", "orden-1", new Decimal("30"), prisma);
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
