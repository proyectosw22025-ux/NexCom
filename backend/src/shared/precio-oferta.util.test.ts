import { describe, it, expect, vi } from "vitest";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { precioEfectivo } from "./precio-oferta.util.js";

function prismaConOfertas(descuentos: number[]) {
  return {
    ofertaProducto: {
      findMany: vi.fn().mockResolvedValue(descuentos.map((d) => ({ oferta: { descuento: d } }))),
    },
  } as unknown as PrismaClient;
}

describe("precioEfectivo", () => {
  it("devuelve el precio base cuando no hay ofertas vigentes", async () => {
    const p = await precioEfectivo("p1", new Decimal("100"), prismaConOfertas([]));
    expect(p.toString()).toBe("100");
  });

  it("aplica el descuento de la oferta vigente", async () => {
    const p = await precioEfectivo("p1", new Decimal("100"), prismaConOfertas([20]));
    expect(p.toString()).toBe("80");
  });

  it("elige el MAYOR descuento cuando hay varias ofertas vigentes", async () => {
    const p = await precioEfectivo("p1", new Decimal("100"), prismaConOfertas([10, 35, 25]));
    expect(p.toString()).toBe("65");
  });

  it("redondea a 4 decimales (consistente con el precio Decimal(12,4))", async () => {
    const p = await precioEfectivo("p1", new Decimal("99.99"), prismaConOfertas([9.5]));
    // 99.99 * 0.905 = 90.49095
    expect(p.toString()).toBe("90.491");
  });
});
