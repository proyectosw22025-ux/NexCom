import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { saldosRepository } from "./saldos.repository.js";
import { publishNotificacion } from "../../shared/pubsub.js";

// Comisión de plataforma según el plan del vendedor (autenticidad de marketplace)
const COMISION_POR_PLAN: Record<string, number> = { FREE: 0.10, PRO: 0.05 };
const COMISION_DEFECTO = 0.10;
const MIN_RETIRO = new Decimal(50); // Bs.

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}
function dosDecimales(d: Decimal) {
  return d.toDecimalPlaces(2).toFixed(2);
}

export const saldosService = {
  // ── Acreditación (llamado desde otros módulos) ───────────────────────────────

  /** Acredita el neto de una venta al saldo del vendedor. Idempotente por orden. */
  async registrarVenta(vendedorId: string, ordenId: string, total: string, plan: string, prisma: PrismaClient) {
    if (await saldosRepository.existeMovimiento(ordenId, "VENTA", prisma)) return;
    const rate    = COMISION_POR_PLAN[plan] ?? COMISION_DEFECTO;
    const totalD  = new Decimal(total);
    const comision = totalD.mul(rate).toDecimalPlaces(2);
    const neto    = totalD.minus(comision);
    await saldosRepository.crearMovimiento(
      {
        vendedorId, tipo: "VENTA", monto: neto.toString(), comision: comision.toString(),
        ordenId, descripcion: `Venta orden #${ordenId.slice(-6).toUpperCase()}`,
      },
      prisma,
    );
  },

  /** Revierte exactamente el neto acreditado al reembolsar una devolución. Idempotente. */
  async registrarReembolso(vendedorId: string, ordenId: string, prisma: PrismaClient) {
    if (await saldosRepository.existeMovimiento(ordenId, "REEMBOLSO", prisma)) return;
    const venta = await saldosRepository.findVentaPorOrden(ordenId, prisma);
    if (!venta) return; // nada que revertir
    await saldosRepository.crearMovimiento(
      {
        vendedorId, tipo: "REEMBOLSO", monto: venta.monto.toString(), comision: "0",
        ordenId, descripcion: `Reembolso orden #${ordenId.slice(-6).toUpperCase()}`,
      },
      prisma,
    );
  },

  // ── Consultas del vendedor ───────────────────────────────────────────────────

  async getSaldo(vendedorId: string, prisma: PrismaClient) {
    const [ventas, reembolsos, pendiente, pagado] = await Promise.all([
      saldosRepository.sumarMovimientos(vendedorId, "VENTA", prisma),
      saldosRepository.sumarMovimientos(vendedorId, "REEMBOLSO", prisma),
      saldosRepository.sumarRetiros(vendedorId, "PENDIENTE", prisma),
      saldosRepository.sumarRetiros(vendedorId, "PAGADO", prisma),
    ]);
    const generado   = new Decimal(ventas.monto).minus(reembolsos.monto);
    const enRevision = new Decimal(pendiente);
    const retirado   = new Decimal(pagado);
    const disponible = generado.minus(enRevision).minus(retirado);
    return {
      disponible:    dosDecimales(disponible),
      generado:      dosDecimales(generado),
      enRevision:    dosDecimales(enRevision),
      retirado:      dosDecimales(retirado),
      comisionTotal: dosDecimales(new Decimal(ventas.comision)),
    };
  },

  async getMovimientos(vendedorId: string, prisma: PrismaClient) {
    const rows = await saldosRepository.listMovimientos(vendedorId, prisma);
    return rows.map((m) => ({
      id: m.id, tipo: m.tipo, monto: dosDecimales(new Decimal(m.monto.toString())),
      comision: dosDecimales(new Decimal(m.comision.toString())),
      ordenIdCorto: m.ordenId ? m.ordenId.slice(-6).toUpperCase() : null,
      descripcion: m.descripcion ?? "", creadoEn: m.creadoEn.toISOString(),
    }));
  },

  async getMisRetiros(vendedorId: string, prisma: PrismaClient) {
    const rows = await saldosRepository.listRetirosByVendedor(vendedorId, prisma);
    return rows.map((r) => mapRetiro(r));
  },

  async solicitarRetiro(
    vendedorId: string,
    input: { monto: string; banco: string; numeroCuenta: string; titular: string },
    prisma: PrismaClient,
  ) {
    const banco        = input.banco.trim();
    const numeroCuenta = input.numeroCuenta.trim();
    const titular      = input.titular.trim();
    if (!banco || !numeroCuenta || !titular) {
      throw bad("Completa los datos bancarios para el retiro.");
    }
    const monto = new Decimal(input.monto || "0");
    if (monto.lte(0))           throw bad("El monto debe ser mayor a cero.");
    if (monto.lt(MIN_RETIRO))   throw bad(`El retiro mínimo es Bs. ${MIN_RETIRO.toFixed(2)}.`);

    const saldo = await this.getSaldo(vendedorId, prisma);
    if (monto.gt(new Decimal(saldo.disponible))) {
      throw bad(`El monto supera tu saldo disponible (Bs. ${saldo.disponible}).`);
    }

    const retiro = await saldosRepository.crearRetiro(
      { vendedorId, monto: monto.toString(), banco, numeroCuenta, titular }, prisma,
    );
    return mapRetiro(retiro);
  },

  // ── Administración de retiros ────────────────────────────────────────────────

  async getRetirosPendientes(prisma: PrismaClient) {
    const rows = await saldosRepository.listRetirosPendientes(prisma);
    return rows.map((r) => mapRetiro(r, r.vendedor.nombreNegocio));
  },

  async getRetirosResueltos(prisma: PrismaClient) {
    const rows = await saldosRepository.listRetirosResueltos(prisma);
    return rows.map((r) => mapRetiro(r, r.vendedor.nombreNegocio));
  },

  async resolverRetiro(retiroId: string, aprobar: boolean, nota: string | null | undefined, prisma: PrismaClient) {
    const retiro = await saldosRepository.findRetiro(retiroId, prisma);
    if (!retiro) throw new GraphQLError("Retiro no encontrado.", { extensions: { code: "NOT_FOUND" } });
    if (retiro.estado !== "PENDIENTE") throw bad("Este retiro ya fue resuelto.");

    const estado = aprobar ? "PAGADO" : "RECHAZADO";
    const actualizado = await saldosRepository.actualizarRetiro(retiroId, estado, nota?.trim() || null, prisma);

    const montoTxt = new Decimal(retiro.monto.toString()).toFixed(2);
    const n = await prisma.notificacion.create({
      data: {
        usuarioId: retiro.vendedor!.usuarioId, tipo: "RETIRO_RESUELTO",
        titulo:  aprobar ? "Retiro pagado" : "Retiro rechazado",
        mensaje: aprobar
          ? `Tu retiro de Bs. ${montoTxt} fue procesado.`
          : `Tu retiro de Bs. ${montoTxt} fue rechazado.${nota ? ` Motivo: ${nota}` : ""}`,
        url: "/vendedor/saldo",
      },
    });
    publishNotificacion(retiro.vendedor!.usuarioId, {
      id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
      leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
    });

    return mapRetiro(actualizado);
  },
};

type RetiroRow = {
  id: string; monto: { toString(): string }; estado: string; banco: string; numeroCuenta: string;
  titular: string; notaAdmin?: string | null; creadoEn: Date; resueltoEn?: Date | null;
};

function mapRetiro(r: RetiroRow, vendedorNombre?: string) {
  return {
    id: r.id, monto: new Decimal(r.monto.toString()).toFixed(2), estado: r.estado,
    banco: r.banco, numeroCuenta: r.numeroCuenta, titular: r.titular,
    notaAdmin: r.notaAdmin ?? null,
    vendedorNombre: vendedorNombre ?? null,
    creadoEn: r.creadoEn.toISOString(),
    resueltoEn: r.resueltoEn ? r.resueltoEn.toISOString() : null,
  };
}
