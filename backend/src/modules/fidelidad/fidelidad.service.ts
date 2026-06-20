import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { fidelidadRepository } from "./fidelidad.repository.js";

// Reglas del programa: ganas 1 punto por cada Bs. pagado; 1 punto = Bs. 0.10 al canjear.
export const PUNTO_VALOR = new Decimal("0.10");

export const fidelidadService = {
  async getBalance(compradorId: string, prisma: PrismaClient) {
    const [ganados, canjeados] = await Promise.all([
      fidelidadRepository.sumar(compradorId, "GANADOS", prisma),
      fidelidadRepository.sumar(compradorId, "CANJEADOS", prisma),
    ]);
    return Math.max(0, ganados - canjeados);
  },

  async getPuntos(compradorId: string, prisma: PrismaClient) {
    const disponibles = await this.getBalance(compradorId, prisma);
    return {
      disponibles,
      valorBs: PUNTO_VALOR.mul(disponibles).toFixed(2),
    };
  },

  async getMovimientos(compradorId: string, prisma: PrismaClient) {
    const rows = await fidelidadRepository.listar(compradorId, prisma);
    return rows.map((m) => ({
      id: m.id, tipo: m.tipo, puntos: m.puntos,
      ordenIdCorto: m.ordenId ? m.ordenId.slice(-6).toUpperCase() : null,
      descripcion: m.descripcion ?? "", creadoEn: m.creadoEn.toISOString(),
    }));
  },

  /**
   * Cotiza un canje: cuántos puntos usar y el descuento, dado el monto descontable
   * (subtotal - cupón). Usa el máximo de puntos disponibles sin exceder ese monto.
   */
  async cotizarCanje(compradorId: string, base: Decimal, prisma: PrismaClient) {
    const disponibles = await this.getBalance(compradorId, prisma);
    if (disponibles <= 0 || base.lte(0)) return { puntosUsados: 0, descuento: new Decimal(0) };
    // puntos máximos que caben en la base (cada punto vale PUNTO_VALOR)
    const maxPorBase = base.div(PUNTO_VALOR).floor().toNumber();
    const puntosUsados = Math.min(disponibles, maxPorBase);
    const descuento = PUNTO_VALOR.mul(puntosUsados);
    return { puntosUsados, descuento };
  },

  /** Acredita puntos ganados por una compra pagada. Idempotente por orden. */
  async registrarGanados(compradorId: string, ordenId: string, baseGasto: Decimal, prisma: PrismaClient) {
    if (await fidelidadRepository.existeMovimiento(ordenId, "GANADOS", prisma)) return;
    const puntos = baseGasto.floor().toNumber();
    if (puntos <= 0) return;
    await fidelidadRepository.crear(
      { compradorId, tipo: "GANADOS", puntos, ordenId, descripcion: `Compra #${ordenId.slice(-6).toUpperCase()}` },
      prisma,
    );
  },

  /** Registra el canje (débito) de puntos al confirmar el pago. Idempotente por orden. */
  async registrarCanje(compradorId: string, ordenId: string, puntos: number, prisma: PrismaClient) {
    if (puntos <= 0) return;
    if (await fidelidadRepository.existeMovimiento(ordenId, "CANJEADOS", prisma)) return;
    await fidelidadRepository.crear(
      { compradorId, tipo: "CANJEADOS", puntos, ordenId, descripcion: `Canje en compra #${ordenId.slice(-6).toUpperCase()}` },
      prisma,
    );
  },
};
