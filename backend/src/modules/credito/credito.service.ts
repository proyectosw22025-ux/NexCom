import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { creditoRepository } from "./credito.repository.js";
import { publishNotificacion } from "../../shared/pubsub.js";

// Retiro mínimo (evita micro-retiros que no cubren el costo operativo).
const RETIRO_MINIMO = 20;

function dos(v: Decimal) {
  return v.toFixed(2); // money con 2 decimales siempre (ej. "100.00")
}
function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

export const creditoService = {
  /**
   * Saldo disponible de la billetera del cliente:
   *   REEMBOLSO − USO − retiros activos (PENDIENTE + PAGADO).
   * Los retiros pendientes RESERVAN el saldo (no se puede gastar lo que ya
   * pediste retirar); los rechazados no descuentan (vuelve a estar disponible).
   */
  async getDisponible(compradorId: string, prisma: PrismaClient): Promise<Decimal> {
    const [reembolsado, usado, retiros] = await Promise.all([
      creditoRepository.sumarPorTipo(compradorId, "REEMBOLSO", prisma),
      creditoRepository.sumarPorTipo(compradorId, "USO", prisma),
      creditoRepository.sumarRetiros(compradorId, ["PENDIENTE", "PAGADO"], prisma),
    ]);
    return reembolsado.minus(usado).minus(retiros);
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
   * Acredita a la billetera del cliente el reembolso de una orden (dinero real
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

  // ── Retiro de la billetera a banco (comprador) ──────────────────────────────

  mapRetiro(r: {
    id: string; monto: { toString(): string }; estado: string; banco: string;
    numeroCuenta: string; titular: string; notaAdmin?: string | null; creadoEn: Date; resueltoEn?: Date | null;
  }) {
    return {
      id: r.id, monto: dos(new Decimal(r.monto.toString())), estado: r.estado,
      banco: r.banco, numeroCuenta: r.numeroCuenta, titular: r.titular,
      notaAdmin: r.notaAdmin ?? null, creadoEn: r.creadoEn.toISOString(),
      resueltoEn: r.resueltoEn ? r.resueltoEn.toISOString() : null,
    };
  },

  /** El cliente solicita retirar su crédito a una cuenta bancaria (atómico). */
  async solicitarRetiro(
    compradorId: string,
    input: { monto: string; banco: string; numeroCuenta: string; titular: string },
    prisma: PrismaClient,
  ) {
    const monto = new Decimal(input.monto);
    if (!monto.isFinite() || monto.lte(0)) throw bad("El monto a retirar debe ser mayor a 0.");
    if (monto.lt(RETIRO_MINIMO)) throw bad(`El retiro mínimo es Bs. ${RETIRO_MINIMO}.`);
    if (!input.banco.trim() || !input.numeroCuenta.trim() || !input.titular.trim()) {
      throw bad("Completa los datos bancarios (banco, número de cuenta y titular).");
    }

    // Chequeo de saldo + creación ATÓMICOS: el lock por comprador serializa
    // retiros/compras concurrentes (no se puede retirar más del disponible).
    const retiro = await prisma.$transaction(async (tx) => {
      const txp = tx as PrismaClient;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${compradorId}))`;
      const disponible = await this.getDisponible(compradorId, txp);
      if (monto.gt(disponible)) {
        throw bad(`El monto supera tu saldo disponible (Bs. ${dos(disponible)}).`);
      }
      return creditoRepository.crearRetiro(
        { compradorId, monto, banco: input.banco.trim(), numeroCuenta: input.numeroCuenta.trim(), titular: input.titular.trim() },
        txp,
      );
    });
    return this.mapRetiro(retiro);
  },

  async getMisRetiros(compradorId: string, prisma: PrismaClient) {
    const rows = await creditoRepository.listRetirosByComprador(compradorId, prisma);
    return rows.map((r) => this.mapRetiro(r));
  },

  // ── Administración (admin) ──────────────────────────────────────────────────

  async getRetirosPendientes(prisma: PrismaClient) {
    const rows = await creditoRepository.listRetirosPendientes(prisma);
    return rows.map((r) => ({
      ...this.mapRetiro(r),
      compradorNombre: (r as { comprador?: { nombreCompleto?: string } }).comprador?.nombreCompleto ?? "",
      compradorEmail:  (r as { comprador?: { usuario?: { email?: string } } }).comprador?.usuario?.email ?? "",
    }));
  },

  /** El admin marca el retiro como pagado o rechazado y notifica al cliente. */
  async resolverRetiro(id: string, aprobar: boolean, nota: string | null, prisma: PrismaClient) {
    const retiro = await creditoRepository.findRetiro(id, prisma);
    if (!retiro) throw new GraphQLError("Retiro no encontrado.", { extensions: { code: "NOT_FOUND" } });
    if (retiro.estado !== "PENDIENTE") throw bad("Este retiro ya fue resuelto.");

    const actualizado = await creditoRepository.actualizarRetiro(id, aprobar ? "PAGADO" : "RECHAZADO", nota?.trim() || null, prisma);
    const montoTxt = dos(new Decimal(retiro.monto.toString()));
    const usuarioId = retiro.comprador!.usuarioId;
    const n = await prisma.notificacion.create({
      data: {
        usuarioId,
        tipo:    aprobar ? "RETIRO_CREDITO_PAGADO" : "RETIRO_CREDITO_RECHAZADO",
        titulo:  aprobar ? "Retiro pagado" : "Retiro rechazado",
        mensaje: aprobar
          ? `Tu retiro de Bs. ${montoTxt} fue procesado a tu cuenta.`
          : `Tu retiro de Bs. ${montoTxt} fue rechazado.${nota?.trim() ? ` Motivo: ${nota.trim()}` : ""} El saldo vuelve a tu billetera.`,
        url: "/cliente/saldo",
      },
    });
    try {
      publishNotificacion(usuarioId, {
        id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
        leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
      });
    } catch { /* pub/sub best-effort */ }
    return this.mapRetiro(actualizado);
  },
};
