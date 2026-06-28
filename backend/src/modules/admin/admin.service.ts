import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { adminRepository } from "./admin.repository.js";
import { getConfigNumber } from "../../shared/config.util.js";
import { calcularRiesgoVendedor } from "./riesgo.util.js";

const ROLES_VALIDOS = ["ADMIN", "VENDEDOR", "COMPRADOR"];

// ── Helpers de analítica (compartidos por los reportes) ──────────────────────
const deltaPct = (cur: number, prev: number) =>
  prev <= 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10;
const kpi = (cur: number, prev: number, dec = 2) => ({ valor: cur.toFixed(dec), delta: deltaPct(cur, prev) });
const mapSeg = (r: { etiqueta: string; valor: number; monto: string }) =>
  ({ etiqueta: r.etiqueta, valor: r.valor, monto: new Decimal(r.monto).toFixed(2) });

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

    const { ing_cur, ing_prev, ord_cur, ord_prev } = raw.kpiOrd;
    const ticketCur  = ord_cur  ? ing_cur  / ord_cur  : 0;
    const ticketPrev = ord_prev ? ing_prev / ord_prev : 0;
    const comCur  = (ing_cur  * comisionPct) / 100;
    const comPrev = (ing_prev * comisionPct) / 100;

    return {
      ingresos:       kpi(ing_cur, ing_prev),
      ordenes:        { valor: String(ord_cur), delta: deltaPct(ord_cur, ord_prev) },
      ticketPromedio: kpi(ticketCur, ticketPrev),
      comision:       kpi(comCur, comPrev),
      usuariosNuevos: { valor: String(raw.kpiUsr.cur), delta: deltaPct(raw.kpiUsr.cur, raw.kpiUsr.prev) },
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

  async getAnaliticaProductos(dias: number, prisma: PrismaClient) {
    const rango = Math.min(Math.max(dias, 1), 90);
    const raw = await adminRepository.analiticaProductos(rango, prisma);
    return {
      unidades:         kpi(raw.kpi.uni_cur, raw.kpi.uni_prev, 0),
      ingresos:         kpi(raw.kpi.ing_cur, raw.kpi.ing_prev),
      productosActivos: raw.productosActivos,
      sinVentas:        raw.sinVentas,
      inventario:       { enStock: raw.inv.en_stock, bajo: raw.inv.bajo, agotado: raw.inv.agotado },
      topProductos:     raw.topProductos.map((t) => ({
        nombre: t.nombre, vendedor: t.vendedor, unidades: t.unidades,
        ingresos: new Decimal(t.ingresos).toFixed(2),
      })),
      porCategoria:     raw.porCategoria.map(mapSeg),
    };
  },

  async getRiesgoVendedores(prisma: PrismaClient) {
    const rows = await adminRepository.senalesRiesgoVendedores(prisma);
    return rows
      .map((r) => {
        const riesgo = calcularRiesgoVendedor({
          total: r.total, cancelados: r.cancelados, disputas: r.disputas,
          disputasPerdidas: r.disputas_perdidas, verificado: r.verificado,
        });
        return {
          vendedorId: r.id, nombre: r.nombre, verificado: r.verificado,
          ordenes: r.total, cancelados: r.cancelados, disputas: r.disputas,
          score: riesgo.score, nivel: riesgo.nivel, factores: riesgo.factores,
        };
      })
      .sort((a, b) => b.score - a.score);
  },

  async getEventosSeguridad(tipo: string | null, limite: number, prisma: PrismaClient) {
    const rows = await adminRepository.eventosSeguridad(tipo?.trim() || null, limite || 100, prisma);
    return rows.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      usuarioId: e.usuarioId ?? null,
      ordenId: e.ordenId ?? null,
      metadata: e.metadata != null ? JSON.stringify(e.metadata) : null,
      creadoEn: e.creadoEn.toISOString(),
    }));
  },

  async getAnaliticaClientes(dias: number, prisma: PrismaClient) {
    const rango = Math.min(Math.max(dias, 1), 90);
    const r = await adminRepository.analiticaClientes(rango, prisma);
    const ticketCur  = r.act.ord_cur  ? r.act.gasto_cur  / r.act.ord_cur  : 0;
    const ticketPrev = r.act.ord_prev ? r.act.gasto_prev / r.act.ord_prev : 0;
    return {
      clientesActivos: { valor: String(r.act.act_cur), delta: deltaPct(r.act.act_cur, r.act.act_prev) },
      ticketPromedio:  kpi(ticketCur, ticketPrev),
      nuevos:          r.nuevos.nuevos,
      recurrentes:     r.nuevos.recurrentes,
      frecuencia:      { f1: r.freq.f1, f2: r.freq.f2, f3: r.freq.f3, f4: r.freq.f4 },
      topClientes:     r.topClientes.map((t) => ({
        nombre: t.nombre, ordenes: t.ordenes,
        gasto: new Decimal(t.gasto).toFixed(2), ticket: new Decimal(t.ticket).toFixed(2),
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
