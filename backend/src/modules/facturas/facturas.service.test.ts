import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { facturasRepository } from "./facturas.repository.js";
import { facturasService } from "./facturas.service.js";

vi.mock("./facturas.repository.js", () => ({
  facturasRepository: {
    findOrdenParaFactura: vi.fn(),
    crear:                vi.fn(),
    findByOrden:          vi.fn(),
  },
}));

const prisma = {} as PrismaClient;

const ordenPagada = {
  id: "orden-1", estado: "PAGADO", total: { toString: () => "113.00" },
  comprador: { id: "comp-1" },
  vendedor:  { id: "vend-1" },
  factura:   null,
};

// La factura creada que devuelve el repo (con includes)
const facturaCreada = {
  id: "f1", numero: 1, nitComprador: "1023456", razonSocial: "Juan Pérez",
  importeTotal: "113.00", iva: "13.00", codigoControl: "A1-B2-C3-D4", fechaEmision: new Date(),
  vendedor: { nombreNegocio: "Tienda X", ciudad: "Santa Cruz" },
  orden: { items: [{ nombreSnapshot: "Producto", cantidad: 1, precioUnitario: "113.00", subtotal: "113.00" }] },
};

describe("facturasService.solicitar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emite la factura con el IVA 13% calculado 'por dentro'", async () => {
    vi.mocked(facturasRepository.findOrdenParaFactura).mockResolvedValue(ordenPagada as never);
    vi.mocked(facturasRepository.crear).mockResolvedValue(facturaCreada as never);

    const r = await facturasService.solicitar("comp-1", "orden-1", "1023456", "Juan Pérez", prisma);

    // total 113 → neto 100, IVA 13
    expect(r).toMatchObject({ numero: 1, importeTotal: "113.00", neto: "100.00", iva: "13.00" });
    const arg = vi.mocked(facturasRepository.crear).mock.calls[0][0];
    expect(arg.iva.toFixed(2)).toBe("13.00");
  });

  it("rechaza si el solicitante no es el cliente de la orden (NOT_FOUND)", async () => {
    vi.mocked(facturasRepository.findOrdenParaFactura).mockResolvedValue(ordenPagada as never);
    await expect(
      facturasService.solicitar("OTRO", "orden-1", "123", "X", prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
    expect(facturasRepository.crear).not.toHaveBeenCalled();
  });

  it("rechaza facturar una orden no pagada", async () => {
    vi.mocked(facturasRepository.findOrdenParaFactura).mockResolvedValue(
      { ...ordenPagada, estado: "PENDIENTE_PAGO" } as never,
    );
    await expect(
      facturasService.solicitar("comp-1", "orden-1", "123", "X", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza una segunda factura para la misma orden (idempotencia)", async () => {
    vi.mocked(facturasRepository.findOrdenParaFactura).mockResolvedValue(
      { ...ordenPagada, factura: { id: "f-existente" } } as never,
    );
    await expect(
      facturasService.solicitar("comp-1", "orden-1", "123", "X", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(facturasRepository.crear).not.toHaveBeenCalled();
  });

  it("rechaza un NIT no numérico", async () => {
    await expect(
      facturasService.solicitar("comp-1", "orden-1", "ABC123", "X", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(facturasRepository.findOrdenParaFactura).not.toHaveBeenCalled();
  });

  it("rechaza si falta la razón social", async () => {
    await expect(
      facturasService.solicitar("comp-1", "orden-1", "123", "  ", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});

describe("facturasService.getByOrden", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no devuelve facturas de otros compradores", async () => {
    vi.mocked(facturasRepository.findByOrden).mockResolvedValue({ ...facturaCreada, compradorId: "OTRO" } as never);
    const r = await facturasService.getByOrden("orden-1", "comp-1", prisma);
    expect(r).toBeNull();
  });
});
