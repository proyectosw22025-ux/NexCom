import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";

import { fidelidadRepository } from "./fidelidad.repository.js";
import { fidelidadService } from "./fidelidad.service.js";

vi.mock("./fidelidad.repository.js", () => ({
  fidelidadRepository: {
    existeMovimiento: vi.fn(),
    crear:            vi.fn(),
    sumar:            vi.fn(),
    listar:           vi.fn(),
  },
}));

const prisma = {} as PrismaClient;

function balance(ganados: number, canjeados: number) {
  vi.mocked(fidelidadRepository.sumar).mockImplementation(async (_c, tipo) =>
    tipo === "GANADOS" ? ganados : canjeados,
  );
}

describe("fidelidadService.getBalance / getPuntos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("balance = ganados - canjeados; valor = puntos * 0.10", async () => {
    balance(500, 120);
    const p = await fidelidadService.getPuntos("c1", prisma);
    expect(p).toMatchObject({ disponibles: 380, valorBs: "38.00" });
  });

  it("nunca devuelve balance negativo", async () => {
    balance(10, 50);
    expect(await fidelidadService.getBalance("c1", prisma)).toBe(0);
  });
});

describe("fidelidadService.cotizarCanje", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa todos los puntos si caben en la base", async () => {
    balance(300, 0); // 300 pts = Bs. 30
    const r = await fidelidadService.cotizarCanje("c1", new Decimal("100"), prisma);
    expect(r.puntosUsados).toBe(300);
    expect(r.descuento.toFixed(2)).toBe("30.00");
  });

  it("limita el canje al monto de la base (no deja total negativo)", async () => {
    balance(1000, 0); // 1000 pts = Bs. 100, pero base es 25
    const r = await fidelidadService.cotizarCanje("c1", new Decimal("25"), prisma);
    expect(r.puntosUsados).toBe(250);          // 250 pts = Bs. 25
    expect(r.descuento.toFixed(2)).toBe("25.00");
  });

  it("sin puntos → no descuenta", async () => {
    balance(0, 0);
    const r = await fidelidadService.cotizarCanje("c1", new Decimal("100"), prisma);
    expect(r.puntosUsados).toBe(0);
    expect(r.descuento.toFixed(2)).toBe("0.00");
  });
});

describe("fidelidadService.registrarGanados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acredita 1 punto por Bs. (piso) si no existe ya el movimiento", async () => {
    vi.mocked(fidelidadRepository.existeMovimiento).mockResolvedValue(false);
    await fidelidadService.registrarGanados("c1", "orden-1", new Decimal("149.90"), prisma);
    expect(fidelidadRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "GANADOS", puntos: 149, ordenId: "orden-1" }), prisma,
    );
  });

  it("es idempotente por orden (no acredita dos veces)", async () => {
    vi.mocked(fidelidadRepository.existeMovimiento).mockResolvedValue(true);
    await fidelidadService.registrarGanados("c1", "orden-1", new Decimal("100"), prisma);
    expect(fidelidadRepository.crear).not.toHaveBeenCalled();
  });
});

describe("fidelidadService.registrarCanje", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registra el débito de puntos (idempotente)", async () => {
    vi.mocked(fidelidadRepository.existeMovimiento).mockResolvedValue(false);
    await fidelidadService.registrarCanje("c1", "orden-1", 250, prisma);
    expect(fidelidadRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "CANJEADOS", puntos: 250 }), prisma,
    );
  });

  it("no registra si puntos = 0", async () => {
    await fidelidadService.registrarCanje("c1", "orden-1", 0, prisma);
    expect(fidelidadRepository.crear).not.toHaveBeenCalled();
  });
});
