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
