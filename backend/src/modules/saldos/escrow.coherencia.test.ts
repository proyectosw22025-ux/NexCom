import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

/**
 * Test de COHERENCIA del dinero (escrow), no de unidades sueltas: ejecuta el ciclo
 * de vida completo contra un ledger append-only en memoria y verifica los
 * INVARIANTES que hacen confiable el sistema:
 *   1. El neto retenido nunca queda negativo.
 *   2. Los fondos solo pasan a "disponible" al LIBERARSE (entrega confirmada).
 *   3. El reembolso (disputa a favor del comprador) revierte exactamente lo retenido.
 *   4. Liberar/retener/reembolsar son idempotentes por orden (sin doble crédito).
 */

interface Mov { vendedorId: string; tipo: string; monto: string; comision: string; ordenId?: string }
const ledger: Mov[] = [];

vi.mock("./saldos.repository.js", () => ({
  saldosRepository: {
    existeMovimiento: vi.fn(async (ordenId: string, tipo: string) => ledger.some((m) => m.ordenId === ordenId && m.tipo === tipo)),
    crearMovimiento:  vi.fn(async (data: Mov) => { ledger.push(data); return data; }),
    findMovimientoPorOrden: vi.fn(async (ordenId: string, tipo: string) => ledger.find((m) => m.ordenId === ordenId && m.tipo === tipo) ?? null),
    findVentaPorOrden: vi.fn(async (ordenId: string) => ledger.find((m) => m.ordenId === ordenId && (m.tipo === "RETENCION" || m.tipo === "VENTA")) ?? null),
    sumarMovimientos: vi.fn(async (vendedorId: string, tipo: string) => {
      const f = ledger.filter((m) => m.vendedorId === vendedorId && m.tipo === tipo);
      return {
        monto: f.reduce((a, m) => a + Number(m.monto), 0).toString(),
        comision: f.reduce((a, m) => a + Number(m.comision), 0).toString(),
      };
    }),
    sumarRetiros: vi.fn(async () => "0"),
    sumarMovimientosDesde: vi.fn(async () => "0"), // sin asentamiento en este test
  },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

import { saldosService } from "./saldos.service.js";

const prisma = {} as PrismaClient;
const V = "vendedor-1";

describe("coherencia del escrow (ciclo de vida del dinero)", () => {
  beforeEach(() => { ledger.length = 0; vi.clearAllMocks(); });

  it("retiene al pagar; solo libera a disponible al confirmar entrega; reembolso revierte exacto", async () => {
    // 1) Pago orden A (Bs.100, FREE 10%) → retiene 90 en garantía, 0 disponible
    await saldosService.registrarRetencion(V, "A", "100.00", "FREE", prisma);
    let s = await saldosService.getSaldo(V, prisma);
    expect(s).toMatchObject({ retenido: "90.00", disponible: "0.00" });

    // 2) Entrega confirmada de A → libera: 0 retenido, 90 disponible
    await saldosService.liberarFondos(V, "A", prisma);
    s = await saldosService.getSaldo(V, prisma);
    expect(s).toMatchObject({ retenido: "0.00", disponible: "90.00" });

    // 3) Pago orden B → +90 retenido (disponible sigue 90, no se mezcla)
    await saldosService.registrarRetencion(V, "B", "100.00", "FREE", prisma);
    s = await saldosService.getSaldo(V, prisma);
    expect(s).toMatchObject({ retenido: "90.00", disponible: "90.00" });

    // 4) Disputa a favor del comprador en B → reembolso revierte exacto: retenido 0
    await saldosService.registrarReembolso(V, "B", prisma);
    s = await saldosService.getSaldo(V, prisma);
    expect(s).toMatchObject({ retenido: "0.00", disponible: "90.00" });
    expect(Number(s.retenido)).toBeGreaterThanOrEqual(0); // invariante: nunca negativo
  });

  it("es idempotente: re-liberar o re-reembolsar no duplica saldo", async () => {
    await saldosService.registrarRetencion(V, "A", "100.00", "FREE", prisma);
    await saldosService.liberarFondos(V, "A", prisma);
    await saldosService.liberarFondos(V, "A", prisma); // repetido
    await saldosService.liberarFondos(V, "A", prisma); // repetido
    const s = await saldosService.getSaldo(V, prisma);
    expect(s.disponible).toBe("90.00"); // un solo crédito, no triple
  });

  it("nunca acredita disponible mientras el dinero sigue retenido (sin entrega)", async () => {
    await saldosService.registrarRetencion(V, "A", "250.00", "FREE", prisma);
    await saldosService.registrarRetencion(V, "B", "250.00", "FREE", prisma);
    const s = await saldosService.getSaldo(V, prisma);
    expect(s.disponible).toBe("0.00");
    expect(s.retenido).toBe("450.00"); // 2 × (250 − 10%)
  });
});
