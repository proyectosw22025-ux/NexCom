import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { creditoRepository } from "./credito.repository.js";

function dos(v: Decimal) {
  return v.toDecimalPlaces(2).toString();
}

export const creditoService = {
  /** Saldo disponible de la billetera del comprador = REEMBOLSO − USO − RETIRO. */
  async getDisponible(compradorId: string, prisma: PrismaClient): Promise<Decimal> {
    const [reembolsado, usado, retirado] = await Promise.all([
      creditoRepository.sumarPorTipo(compradorId, "REEMBOLSO", prisma),
      creditoRepository.sumarPorTipo(compradorId, "USO", prisma),
      creditoRepository.sumarPorTipo(compradorId, "RETIRO", prisma),
    ]);
    return reembolsado.minus(usado).minus(retirado);
  },

  async getBilletera(compradorId: string, prisma: PrismaClient) {
    const [disponible, movimientos] = await Promise.all([
      this.getDisponible(compradorId, prisma),
      creditoRepository.listar(compradorId, prisma),
    ]);
    return {
      disponible:  dos(disponible),
      movimientos: movimientos.map((m) => ({
        id:          m.id,
        tipo:        m.tipo,
        monto:       dos(new Decimal(m.monto.toString())),
        ordenId:     m.ordenId,
        descripcion: m.descripcion,
        creadoEn:    m.creadoEn.toISOString(),
      })),
    };
  },

  /**
   * Acredita a la billetera del comprador el reembolso de una orden (dinero real
   * que vuelve). Idempotente por orden: no acredita dos veces la misma devolución.
   */
  async acreditarReembolso(
    compradorId: string, ordenId: string, monto: Decimal, prisma: PrismaClient,
  ) {
    if (monto.lte(0)) return;
    if (await creditoRepository.existeMovimiento(ordenId, "REEMBOLSO", prisma)) return;
    await creditoRepository.crear(
      { compradorId, tipo: "REEMBOLSO", monto, ordenId,
        descripcion: `Reembolso orden #${ordenId.slice(-6).toUpperCase()}` },
      prisma,
    );
  },

  /**
   * Cotiza cuánto crédito se puede aplicar a una compra de `base` (no supera ni
   * el saldo ni la base). No consume: la baja (USO) se registra al confirmar.
   */
  async cotizarUso(compradorId: string, base: Decimal, prisma: PrismaClient): Promise<Decimal> {
    const disponible = await this.getDisponible(compradorId, prisma);
    return Decimal.min(disponible, base).toDecimalPlaces(2);
  },

  /** Registra el débito (USO) del crédito aplicado a una orden. Idempotente por orden. */
  async registrarUso(
    compradorId: string, ordenId: string, monto: Decimal, prisma: PrismaClient,
  ) {
    if (monto.lte(0)) return;
    if (await creditoRepository.existeMovimiento(ordenId, "USO", prisma)) return;
    await creditoRepository.crear(
      { compradorId, tipo: "USO", monto, ordenId,
        descripcion: `Crédito usado en orden #${ordenId.slice(-6).toUpperCase()}` },
      prisma,
    );
  },
};
