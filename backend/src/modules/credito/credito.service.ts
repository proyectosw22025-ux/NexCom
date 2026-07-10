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

  /**
   * Registra el débito (USO) del crédito aplicado a una orden, de forma ATÓMICA
   * y sin sobregiro. El lock consultivo por comprador serializa checkouts
   * concurrentes (check-then-act), y el monto se CAPA al saldo disponible: la
   * billetera nunca queda negativa aunque dos compras usen el mismo crédito.
   * Idempotente por orden. Devuelve el monto realmente debitado.
   */
  async registrarUso(
    compradorId: string, ordenId: string, monto: Decimal, prisma: PrismaClient,
  ): Promise<Decimal> {
    if (monto.lte(0)) return new Decimal(0);
    return prisma.$transaction(async (tx) => {
      const txp = tx as PrismaClient;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${compradorId}))`;
      if (await creditoRepository.existeMovimiento(ordenId, "USO", txp)) return monto; // ya debitado
      const disponible = await this.getDisponible(compradorId, txp);
      const real = Decimal.min(disponible, monto).toDecimalPlaces(2);
      if (real.gt(0)) {
        await creditoRepository.crear(
          { compradorId, tipo: "USO", monto: real, ordenId,
            descripcion: `Crédito usado en orden #${ordenId.slice(-6).toUpperCase()}` },
          txp,
        );
      }
      return real;
    });
  },
};
