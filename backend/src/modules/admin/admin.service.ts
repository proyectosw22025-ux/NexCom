import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { adminRepository } from "./admin.repository.js";
import { getConfigNumber } from "../../shared/config.util.js";

const ROLES_VALIDOS = ["ADMIN", "VENDEDOR", "COMPRADOR"];

export const adminService = {
  async getUsuarios(
    { rol, activo, pagina = 1, limite = 20 }: { rol?: string; activo?: boolean; pagina?: number; limite?: number },
    prisma: PrismaClient,
  ) {
    if (rol && !ROLES_VALIDOS.includes(rol)) {
      throw new GraphQLError("Rol inválido.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    return adminRepository.findAllUsuarios({ rol, activo }, pagina, Math.min(limite, 100), prisma);
  },

  async getUsuarioDetalle(id: string, prisma: PrismaClient) {
    const usuario = await adminRepository.findById(id, prisma);
    if (!usuario) throw new GraphQLError("Usuario no encontrado.", { extensions: { code: "NOT_FOUND" } });
    return usuario;
  },

  async getEstadisticas(dias: number, prisma: PrismaClient) {
    const rango = Math.min(Math.max(dias, 1), 90);
    const base  = await adminRepository.estadisticas(rango, prisma);

    // H.1 — Comisión del marketplace: % configurable (config "comision_plataforma")
    // aplicado sobre los ingresos del periodo. Modelo de negocio de la plataforma.
    const comisionPorcentaje = await getConfigNumber("comision_plataforma", prisma) || 0;
    const comisionPeriodo = new Decimal(base.ingresosPeriodo)
      .mul(comisionPorcentaje).div(100).toFixed(2);

    return { ...base, comisionPorcentaje, comisionPeriodo };
  },

  async getAnalitica(dias: number, prisma: PrismaClient) {
    const rango = Math.min(Math.max(dias, 1), 90);
    const [raw, comisionPct] = await Promise.all([
      adminRepository.analitica(rango, prisma),
      getConfigNumber("comision_plataforma", prisma).then((v) => v || 0),
    ]);

    // delta % vs periodo anterior; redondeado a 1 decimal
    const delta = (cur: number, prev: number) => {
      if (prev <= 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };
    const kpi = (cur: number, prev: number, dec = 2) => ({ valor: cur.toFixed(dec), delta: delta(cur, prev) });

    const { ing_cur, ing_prev, ord_cur, ord_prev } = raw.kpiOrd;
    const ticketCur  = ord_cur  ? ing_cur  / ord_cur  : 0;
    const ticketPrev = ord_prev ? ing_prev / ord_prev : 0;
    const comCur  = (ing_cur  * comisionPct) / 100;
    const comPrev = (ing_prev * comisionPct) / 100;

    const mapSeg = (r: { etiqueta: string; valor: number; monto: string }) =>
      ({ etiqueta: r.etiqueta, valor: r.valor, monto: new Decimal(r.monto).toFixed(2) });

    return {
      ingresos:       kpi(ing_cur, ing_prev),
      ordenes:        { valor: String(ord_cur), delta: delta(ord_cur, ord_prev) },
      ticketPromedio: kpi(ticketCur, ticketPrev),
      comision:       kpi(comCur, comPrev),
      usuariosNuevos: { valor: String(raw.kpiUsr.cur), delta: delta(raw.kpiUsr.cur, raw.kpiUsr.prev) },
      serie: raw.serie.map((d) => ({ fecha: d.fecha, ingresos: parseFloat(d.total), ordenes: d.ordenes })),
      porMetodoPago: raw.porMetodo.map(mapSeg),
      porEstado:     raw.porEstado.map(mapSeg),
      porCiudad:     raw.porCiudad.map(mapSeg),
      topVendedores: raw.topVend.map((v) => ({
        nombreNegocio: v.nombreNegocio,
        ingresos: new Decimal(v.ingresos).toFixed(2),
        ventas: v.ventas,
        rating: new Decimal(v.rating || "0").toFixed(2),
      })),
    };
  },

  async toggleActivo(id: string, requesterId: string, prisma: PrismaClient) {
    if (id === requesterId) {
      throw new GraphQLError("No puedes desactivar tu propia cuenta.", { extensions: { code: "FORBIDDEN" } });
    }
    return adminRepository.toggleActivo(id, prisma);
  },

  async cambiarRol(id: string, rol: string, requesterId: string, prisma: PrismaClient) {
    if (!ROLES_VALIDOS.includes(rol)) {
      throw new GraphQLError("Rol inválido.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (id === requesterId) {
      throw new GraphQLError("No puedes cambiar tu propio rol.", { extensions: { code: "FORBIDDEN" } });
    }
    return adminRepository.updateRol(id, rol, prisma);
  },
};
