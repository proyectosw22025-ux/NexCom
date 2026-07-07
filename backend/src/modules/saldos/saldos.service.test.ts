import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { saldosRepository } from "./saldos.repository.js";
import { saldosService } from "./saldos.service.js";

vi.mock("./saldos.repository.js", () => ({
  saldosRepository: {
    existeMovimiento:       vi.fn(),
    crearMovimiento:        vi.fn(),
    findVentaPorOrden:      vi.fn(),
    findMovimientoPorOrden: vi.fn(),
    sumarMovimientos:       vi.fn(),
    sumarRetiros:          vi.fn(),
    listMovimientos:       vi.fn(),
    getVerificado:         vi.fn(),
    crearRetiro:           vi.fn(),
    listRetirosByVendedor: vi.fn(),
    listRetirosPendientes: vi.fn(),
    listRetirosResueltos:  vi.fn(),
    findRetiro:            vi.fn(),
    actualizarRetiro:      vi.fn(),
  },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

// Stub con $transaction pass-through (solicitarRetiro es atómico): tx === prisma,
// así las aserciones sobre los mocks del repositorio siguen recibiendo `prisma`.
const prisma = {
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  $executeRaw:  async () => 0, // pg_advisory_xact_lock (no-op en tests)
} as unknown as PrismaClient;

describe("saldosService.registrarRetencion (escrow, comisión por plan)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("FREE: retiene 10% de comisión y RETIENE el 90% neto en garantía", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(false);
    await saldosService.registrarRetencion("v1", "orden-1", "100.00", "FREE", prisma);
    expect(saldosRepository.crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "RETENCION", monto: "90", comision: "10" }), prisma,
    );
  });

  it("PRO: retiene solo 5% de comisión", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(false);
    await saldosService.registrarRetencion("v1", "orden-2", "200.00", "PRO", prisma);
    expect(saldosRepository.crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "RETENCION", monto: "190", comision: "10" }), prisma,
    );
  });

  it("es idempotente: no retiene dos veces la misma orden", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(true);
    await saldosService.registrarRetencion("v1", "orden-1", "100.00", "FREE", prisma);
    expect(saldosRepository.crearMovimiento).not.toHaveBeenCalled();
  });
});

describe("saldosService.liberarFondos (retenido → disponible)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("libera exactamente el neto retenido de la orden", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(false);
    vi.mocked(saldosRepository.findMovimientoPorOrden).mockResolvedValue({ monto: "90", comision: "10" } as never);
    await saldosService.liberarFondos("v1", "orden-1", prisma);
    expect(saldosRepository.crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "LIBERACION", monto: "90" }), prisma,
    );
  });

  it("es idempotente: no libera dos veces la misma orden", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(true);
    await saldosService.liberarFondos("v1", "orden-1", prisma);
    expect(saldosRepository.crearMovimiento).not.toHaveBeenCalled();
  });

  it("no libera si no hay retención previa", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(false);
    vi.mocked(saldosRepository.findMovimientoPorOrden).mockResolvedValue(null);
    await saldosService.liberarFondos("v1", "orden-x", prisma);
    expect(saldosRepository.crearMovimiento).not.toHaveBeenCalled();
  });
});

describe("saldosService.registrarReembolso (clawback exacto)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revierte exactamente el neto que se acreditó (no recalcula)", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(false);
    vi.mocked(saldosRepository.findVentaPorOrden).mockResolvedValue({ monto: "90" } as never);
    await saldosService.registrarReembolso("v1", "orden-1", prisma);
    expect(saldosRepository.crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "REEMBOLSO", monto: "90" }), prisma,
    );
  });

  it("no hace nada si no existe la venta original", async () => {
    vi.mocked(saldosRepository.existeMovimiento).mockResolvedValue(false);
    vi.mocked(saldosRepository.findVentaPorOrden).mockResolvedValue(null);
    await saldosService.registrarReembolso("v1", "orden-x", prisma);
    expect(saldosRepository.crearMovimiento).not.toHaveBeenCalled();
  });
});

describe("saldosService.getSaldo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("separa retenido (escrow) de disponible y aplica retiros", async () => {
    const map: Record<string, { monto: string; comision: string }> = {
      VENTA:       { monto: "100", comision: "0"  }, // legacy → disponible
      RETENCION:   { monto: "500", comision: "50" }, // entra a retenido
      LIBERACION:  { monto: "300", comision: "0"  }, // 300 ya liberado
      REEMBOLSO:   { monto: "0",   comision: "0"  },
      SUSCRIPCION: { monto: "0",   comision: "0"  },
    };
    vi.mocked(saldosRepository.sumarMovimientos).mockImplementation(async (_v, tipo) => map[tipo]);
    vi.mocked(saldosRepository.sumarRetiros).mockImplementation(async (_v, estado) =>
      estado === "PENDIENTE" ? "50" : "100",
    );
    const s = await saldosService.getSaldo("v1", prisma);
    // retenido = 500 - 300 = 200; disponible = 100 + 300 - 50 - 100 = 250; generado = 100 + 500 = 600
    expect(s).toMatchObject({
      retenido: "200.00", disponible: "250.00", generado: "600.00",
      enRevision: "50.00", retirado: "100.00", comisionTotal: "50.00",
    });
  });
});

describe("saldosService.solicitarRetiro", () => {
  beforeEach(() => vi.clearAllMocks());

  const saldoDisponible = (disp: string) => {
    vi.mocked(saldosRepository.sumarMovimientos).mockImplementation(async (_v, tipo) =>
      tipo === "VENTA" ? { monto: disp, comision: "0" } : { monto: "0", comision: "0" },
    );
    vi.mocked(saldosRepository.sumarRetiros).mockResolvedValue("0");
    vi.mocked(saldosRepository.getVerificado).mockResolvedValue(true); // KYC ok por defecto
  };

  it("crea el retiro cuando el monto está dentro del saldo disponible", async () => {
    saldoDisponible("300");
    vi.mocked(saldosRepository.crearRetiro).mockResolvedValue({
      id: "r1", monto: "150", estado: "PENDIENTE", banco: "Bisa", numeroCuenta: "123", titular: "Ana", creadoEn: new Date(),
    } as never);
    const r = await saldosService.solicitarRetiro(
      "v1", { monto: "150", banco: "Bisa", numeroCuenta: "123", titular: "Ana" }, prisma,
    );
    expect(r).toMatchObject({ id: "r1", estado: "PENDIENTE", monto: "150.00" });
  });

  it("rechaza un retiro que supera el saldo disponible (sin sobregiro)", async () => {
    saldoDisponible("100");
    await expect(
      saldosService.solicitarRetiro("v1", { monto: "150", banco: "Bisa", numeroCuenta: "1", titular: "Ana" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(saldosRepository.crearRetiro).not.toHaveBeenCalled();
  });

  it("rechaza montos por debajo del mínimo", async () => {
    saldoDisponible("1000");
    await expect(
      saldosService.solicitarRetiro("v1", { monto: "10", banco: "Bisa", numeroCuenta: "1", titular: "Ana" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si faltan datos bancarios", async () => {
    saldoDisponible("1000");
    await expect(
      saldosService.solicitarRetiro("v1", { monto: "100", banco: "", numeroCuenta: "1", titular: "Ana" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("cobrarSuscripcion debita disponible y rechaza si el saldo no alcanza", async () => {
    saldoDisponible("100"); // disponible = 100
    const { Decimal } = await import("decimal.js");
    // 99 ≤ 100 → cobra
    await saldosService.cobrarSuscripcion("v1", new Decimal(99), "Plan PRO", prisma);
    expect(saldosRepository.crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "SUSCRIPCION", monto: "99" }), prisma,
    );
    // 150 > 100 → rechaza sin crear movimiento
    vi.mocked(saldosRepository.crearMovimiento).mockClear();
    await expect(
      saldosService.cobrarSuscripcion("v1", new Decimal(150), "Plan PRO", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(saldosRepository.crearMovimiento).not.toHaveBeenCalled();
  });

  it("rechaza el retiro si el vendedor no está verificado (KYC)", async () => {
    saldoDisponible("1000");
    vi.mocked(saldosRepository.getVerificado).mockResolvedValue(false);
    await expect(
      saldosService.solicitarRetiro("v1", { monto: "100", banco: "Bisa", numeroCuenta: "1", titular: "Ana" }, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(saldosRepository.crearRetiro).not.toHaveBeenCalled();
  });
});

describe("saldosService.resolverRetiro", () => {
  beforeEach(() => vi.clearAllMocks());

  const prismaN = { notificacion: { create: vi.fn().mockResolvedValue({
    id: "n", tipo: "RETIRO_RESUELTO", titulo: "t", mensaje: "m", leido: false, url: null, ordenId: null, creadoEn: new Date(),
  }) } } as unknown as PrismaClient;

  const pendiente = {
    id: "r1", monto: "150", estado: "PENDIENTE", banco: "Bisa", numeroCuenta: "1", titular: "Ana", creadoEn: new Date(),
    vendedor: { id: "v1", usuarioId: "u-v" },
  };

  it("aprueba (PAGADO) y notifica al vendedor", async () => {
    vi.mocked(saldosRepository.findRetiro).mockResolvedValue(pendiente as never);
    vi.mocked(saldosRepository.actualizarRetiro).mockResolvedValue({ ...pendiente, estado: "PAGADO", resueltoEn: new Date() } as never);
    const r = await saldosService.resolverRetiro("r1", true, null, prismaN);
    expect(saldosRepository.actualizarRetiro).toHaveBeenCalledWith("r1", "PAGADO", null, prismaN);
    expect(r.estado).toBe("PAGADO");
  });

  it("rechaza resolver un retiro que ya no está pendiente", async () => {
    vi.mocked(saldosRepository.findRetiro).mockResolvedValue({ ...pendiente, estado: "PAGADO" } as never);
    await expect(
      saldosService.resolverRetiro("r1", true, null, prismaN),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
