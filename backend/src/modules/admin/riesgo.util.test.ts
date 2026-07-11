import { describe, it, expect } from "vitest";
import { calcularRiesgoVendedor } from "./riesgo.util.js";

describe("calcularRiesgoVendedor", () => {
  it("vendedor sano y verificado → riesgo BAJO", () => {
    const r = calcularRiesgoVendedor({ total: 50, cancelados: 1, disputas: 0, disputasPerdidas: 0, verificado: true });
    expect(r.nivel).toBe("BAJO");
    expect(r.score).toBeLessThan(30);
  });

  it("alta cancelación + reclamos → riesgo ALTO", () => {
    const r = calcularRiesgoVendedor({ total: 10, cancelados: 5, disputas: 4, disputasPerdidas: 3, verificado: false });
    expect(r.nivel).toBe("ALTO");
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.factores).toContain("Sin verificación (KYC)");
  });

  it("sin verificación suma riesgo pero no por sí sola lo vuelve ALTO", () => {
    const r = calcularRiesgoVendedor({ total: 20, cancelados: 0, disputas: 0, disputasPerdidas: 0, verificado: false });
    expect(r.score).toBe(10);
    expect(r.nivel).toBe("BAJO");
    expect(r.factores).toEqual(["Sin verificación (KYC)"]);
  });

  it("el score está acotado a 100", () => {
    const r = calcularRiesgoVendedor({ total: 5, cancelados: 5, disputas: 5, disputasPerdidas: 10, verificado: false });
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("disputas perdidas aparecen como factor", () => {
    const r = calcularRiesgoVendedor({ total: 30, cancelados: 0, disputas: 2, disputasPerdidas: 2, verificado: true });
    expect(r.factores.some((f) => f.includes("a favor del cliente"))).toBe(true);
  });
});
