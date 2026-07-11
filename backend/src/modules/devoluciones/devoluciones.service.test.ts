import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { devolucionesRepository } from "./devoluciones.repository.js";
import { devolucionesService } from "./devoluciones.service.js";
import { creditoService } from "../credito/credito.service.js";

vi.mock("./devoluciones.repository.js", () => ({
  devolucionesRepository: {
    findOrdenParaDevolucion:  vi.fn(),
    crear:                    vi.fn(),
    findConParticipantes:     vi.fn(),
    rechazar:                 vi.fn(),
    reembolsar:               vi.fn(),
    findByComprador:          vi.fn(),
    findByVendedor:           vi.fn(),
    findByOrden:              vi.fn(),
    findSolicitadasVencidas:  vi.fn(),
  },
}));
vi.mock("../saldos/saldos.service.js", () => ({
  saldosService: { registrarVenta: vi.fn(), registrarReembolso: vi.fn() },
}));
vi.mock("../credito/credito.service.js", () => ({
  creditoService: { acreditarReembolso: vi.fn() },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

const notifCreate = vi.fn().mockResolvedValue({
  id: "n1", tipo: "X", titulo: "t", mensaje: "m", leido: false, url: null, ordenId: null, creadoEn: new Date(),
});
const prisma = { notificacion: { create: notifCreate } } as unknown as PrismaClient;

const ordenEntregada = {
  id: "orden-1", estado: "ENTREGADO", total: { toString: () => "150.00" },
  comprador: { id: "comp-1", usuarioId: "u-comp" },
  vendedor:  { id: "vend-1", usuarioId: "u-vend", nombreNegocio: "Tienda X" },
  items: [{ productoId: "p1", cantidad: 2 }],
  devolucion: null,
  historialEstados: [{ creadoEn: new Date() }], // entregada hoy → dentro de ventana
};

describe("devolucionesService.solicitar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea la devolución de una orden entregada y notifica al vendedor", async () => {
    vi.mocked(devolucionesRepository.findOrdenParaDevolucion).mockResolvedValue(ordenEntregada as never);
    vi.mocked(devolucionesRepository.crear).mockResolvedValue({
      id: "dev-1", ordenId: "orden-1", motivo: "No funciona", estado: "SOLICITADA",
      montoReembolso: { toString: () => "150.00" }, respuestaVendedor: null, creadoEn: new Date(),
    } as never);

    const r = await devolucionesService.solicitar("comp-1", "u-comp", "orden-1", "El producto llegó dañado", "DEFECTUOSO", [], prisma);

    expect(r).toMatchObject({ id: "dev-1", estado: "SOLICITADA", montoReembolso: "150.00", otroNombre: "Tienda X" });
    // monto = total de la orden
    expect(devolucionesRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ ordenId: "orden-1", vendedorId: "vend-1" }), prisma,
    );
    expect(notifCreate).toHaveBeenCalledTimes(1);
    expect(notifCreate.mock.calls[0][0].data.usuarioId).toBe("u-vend");
  });

  it("rechaza si el solicitante no es el cliente de la orden (NOT_FOUND)", async () => {
    vi.mocked(devolucionesRepository.findOrdenParaDevolucion).mockResolvedValue(ordenEntregada as never);
    await expect(
      devolucionesService.solicitar("OTRO", "u-x", "orden-1", "motivo válido", "DEFECTUOSO", [], prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
    expect(devolucionesRepository.crear).not.toHaveBeenCalled();
  });

  it("rechaza si la orden no está entregada/completada", async () => {
    vi.mocked(devolucionesRepository.findOrdenParaDevolucion).mockResolvedValue(
      { ...ordenEntregada, estado: "PAGADO" } as never,
    );
    await expect(
      devolucionesService.solicitar("comp-1", "u-comp", "orden-1", "motivo válido", "DEFECTUOSO", [], prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza una segunda solicitud para la misma orden (idempotencia)", async () => {
    vi.mocked(devolucionesRepository.findOrdenParaDevolucion).mockResolvedValue(
      { ...ordenEntregada, devolucion: { id: "dev-existente" } } as never,
    );
    await expect(
      devolucionesService.solicitar("comp-1", "u-comp", "orden-1", "motivo válido", "DEFECTUOSO", [], prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si venció la ventana de devolución (7 días)", async () => {
    const hace10dias = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    vi.mocked(devolucionesRepository.findOrdenParaDevolucion).mockResolvedValue(
      { ...ordenEntregada, historialEstados: [{ creadoEn: hace10dias }] } as never,
    );
    await expect(
      devolucionesService.solicitar("comp-1", "u-comp", "orden-1", "motivo válido", "DEFECTUOSO", [], prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza un motivo demasiado corto", async () => {
    await expect(
      devolucionesService.solicitar("comp-1", "u-comp", "orden-1", "no", "DEFECTUOSO", [], prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(devolucionesRepository.findOrdenParaDevolucion).not.toHaveBeenCalled();
  });
});

describe("devolucionesService.responder", () => {
  beforeEach(() => vi.clearAllMocks());

  const devSolicitada = {
    id: "dev-1", estado: "SOLICITADA", ordenId: "orden-1", montoReembolso: { toString: () => "150.00" },
    comprador: { id: "comp-1", usuarioId: "u-comp" },
    vendedor:  { id: "vend-1", usuarioId: "u-vend" },
    orden:     { items: [{ productoId: "p1", cantidad: 2 }] },
  };

  it("al aprobar: reembolsa (restock) y notifica al cliente", async () => {
    vi.mocked(devolucionesRepository.findConParticipantes).mockResolvedValue(devSolicitada as never);
    vi.mocked(devolucionesRepository.reembolsar).mockResolvedValue({
      id: "dev-1", ordenId: "orden-1", estado: "REEMBOLSADA",
      montoReembolso: { toString: () => "150.00" }, respuestaVendedor: null, creadoEn: new Date(),
    } as never);

    const r = await devolucionesService.responder("vend-1", "u-vend", "dev-1", true, "Lamentamos el inconveniente", prisma);

    expect(r.estado).toBe("REEMBOLSADA");
    // restock con los items de la orden
    expect(devolucionesRepository.reembolsar).toHaveBeenCalledWith(
      "dev-1", "Lamentamos el inconveniente", [{ productoId: "p1", cantidad: 2 }], prisma,
    );
    expect(notifCreate.mock.calls[0][0].data.usuarioId).toBe("u-comp");
  });

  it("al rechazar: no restockea y notifica al cliente", async () => {
    vi.mocked(devolucionesRepository.findConParticipantes).mockResolvedValue(devSolicitada as never);
    vi.mocked(devolucionesRepository.rechazar).mockResolvedValue({
      id: "dev-1", ordenId: "orden-1", estado: "RECHAZADA",
      montoReembolso: { toString: () => "150.00" }, respuestaVendedor: "Fuera de plazo", creadoEn: new Date(),
    } as never);

    const r = await devolucionesService.responder("vend-1", "u-vend", "dev-1", false, "Fuera de plazo", prisma);

    expect(r.estado).toBe("RECHAZADA");
    expect(devolucionesRepository.reembolsar).not.toHaveBeenCalled();
    expect(devolucionesRepository.rechazar).toHaveBeenCalled();
  });

  it("rechaza a un vendedor que no es el dueño de la devolución (NOT_FOUND)", async () => {
    vi.mocked(devolucionesRepository.findConParticipantes).mockResolvedValue(devSolicitada as never);
    await expect(
      devolucionesService.responder("OTRO-VEND", "u-x", "dev-1", true, null, prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });

  it("rechaza resolver una devolución ya resuelta", async () => {
    vi.mocked(devolucionesRepository.findConParticipantes).mockResolvedValue(
      { ...devSolicitada, estado: "REEMBOLSADA" } as never,
    );
    await expect(
      devolucionesService.responder("vend-1", "u-vend", "dev-1", true, null, prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});

describe("devolucionesService.autoResolverVencidas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aprueba automáticamente las devoluciones que el vendedor ignoró y acredita la billetera", async () => {
    vi.mocked(devolucionesRepository.findSolicitadasVencidas).mockResolvedValue([{
      id: "dev-1", ordenId: "orden-1", montoReembolso: { toString: () => "150.00" },
      comprador: { id: "comp-1", usuarioId: "u-comp" },
      vendedor:  { id: "vend-1", usuarioId: "u-vend" },
      orden:     { items: [{ productoId: "p1", cantidad: 1 }] },
    }] as never);
    vi.mocked(devolucionesRepository.reembolsar).mockResolvedValue({ id: "dev-1" } as never);

    await devolucionesService.autoResolverVencidas(prisma);

    expect(devolucionesRepository.reembolsar).toHaveBeenCalledWith(
      "dev-1", expect.stringContaining("no respondió"), [{ productoId: "p1", cantidad: 1 }], prisma,
    );
    expect(creditoService.acreditarReembolso).toHaveBeenCalledWith(
      "comp-1", "orden-1", expect.anything(), prisma,
    );
  });

  it("no hace nada si no hay devoluciones vencidas", async () => {
    vi.mocked(devolucionesRepository.findSolicitadasVencidas).mockResolvedValue([] as never);
    await devolucionesService.autoResolverVencidas(prisma);
    expect(devolucionesRepository.reembolsar).not.toHaveBeenCalled();
  });
});
