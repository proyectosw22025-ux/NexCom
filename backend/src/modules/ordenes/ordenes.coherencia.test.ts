import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { saldosService } from "../saldos/saldos.service.js";
import { creditoService } from "../credito/credito.service.js";
import { ordenesService } from "./ordenes.service.js";

vi.mock("../saldos/saldos.service.js", () => ({
  saldosService: { registrarReembolso: vi.fn() },
}));
vi.mock("../credito/credito.service.js", () => ({
  creditoService: { acreditarReembolso: vi.fn() },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

const ordenVencida = {
  id: "orden-1", vendedorId: "v1", compradorId: "c1", estado: "PAGADO",
  total: { toString: () => "150.00" }, items: [{ productoId: "p1", cantidad: 1 }],
};

/**
 * Stub de prisma cuyo `updateMany` (dentro de $transaction) devuelve `count`.
 * count=1 → el CAS gana la transición a CANCELADO; count=0 → la perdió.
 */
function makePrisma(casCount: number) {
  const tx = {
    orden:               { updateMany: vi.fn().mockResolvedValue({ count: casCount }) },
    historialEstadoOrden:{ create: vi.fn() },
    producto:            { update: vi.fn() },
  };
  return {
    _tx: tx, // expuesto solo para aserciones del test
    orden:            { findMany: vi.fn().mockResolvedValue([ordenVencida]) },
    $transaction:     async (fn: (t: unknown) => unknown) => fn(tx),
    eventoSeguridad:  { create: vi.fn() },
    perfilComprador:  { findUnique: vi.fn().mockResolvedValue({ usuarioId: "u-c1" }) },
    notificacion:     { create: vi.fn().mockResolvedValue({
      id: "n", tipo: "ORDEN_CANCELADA", titulo: "t", mensaje: "m", leido: false, url: null, ordenId: null, creadoEn: new Date(),
    }) },
  } as unknown as PrismaClient;
}

describe("coherencia escrow: auto-cancelación por no-envío vs. respuesta tardía del vendedor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CAS gana (count=1): cancela, reembolsa al vendedor y acredita la billetera del cliente", async () => {
    const prisma = makePrisma(1);
    await ordenesService._cancelarOrdenesSinEnvio({}, prisma);
    expect(saldosService.registrarReembolso).toHaveBeenCalledWith("v1", "orden-1", prisma);
    expect(creditoService.acreditarReembolso).toHaveBeenCalledWith(
      "c1", "orden-1", expect.anything(), prisma,
    );
  });

  it("CAS pierde (count=0): el vendedor avanzó la orden justo antes → NO reembolsa ni acredita", async () => {
    const prisma = makePrisma(0);
    await ordenesService._cancelarOrdenesSinEnvio({}, prisma);
    // "Gana quien transicionó primero": la orden ya fue enviada, no hay doble efecto.
    expect(saldosService.registrarReembolso).not.toHaveBeenCalled();
    expect(creditoService.acreditarReembolso).not.toHaveBeenCalled();
  });
});

describe("coherencia: limpieza de checkouts abandonados (stock huérfano) vs. pago tardío", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CAS gana (count=1): cancela y DEVUELVE el stock de la orden abandonada", async () => {
    const prisma = makePrisma(1);
    await ordenesService._cancelarPagosAbandonados(prisma);
    // restock: increment por cada ítem
    expect((prisma as unknown as { _tx: { producto: { update: ReturnType<typeof vi.fn> } } })._tx.producto.update)
      .toHaveBeenCalledWith(expect.objectContaining({ data: { stock: { increment: 1 } } }));
  });

  it("CAS pierde (count=0): el webhook confirmó el pago justo antes → NO restituye stock", async () => {
    const prisma = makePrisma(0);
    await ordenesService._cancelarPagosAbandonados(prisma);
    expect((prisma as unknown as { _tx: { producto: { update: ReturnType<typeof vi.fn> } } })._tx.producto.update)
      .not.toHaveBeenCalled();
  });
});
