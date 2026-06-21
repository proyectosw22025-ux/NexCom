import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { adminService } from "./admin.service.js";
import { snapshotMetricas } from "../../shared/metrics.js";

export const adminResolvers = {
  Query: {
    listarUsuarios: (
      _: unknown,
      args: { rol?: string; activo?: boolean; pagina?: number; limite?: number },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return adminService.getUsuarios(args, ctx.prisma);
    },

    usuarioDetalle: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return adminService.getUsuarioDetalle(id, ctx.prisma);
    },

    estadisticasAdmin: (_: unknown, { dias }: { dias?: number }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return adminService.getEstadisticas(dias ?? 7, ctx.prisma);
    },

    analiticaAdmin: (_: unknown, { dias }: { dias?: number }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return adminService.getAnalitica(dias ?? 30, ctx.prisma);
    },

    analiticaProductos: (_: unknown, { dias }: { dias?: number }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return adminService.getAnaliticaProductos(dias ?? 30, ctx.prisma);
    },

    analiticaClientes: (_: unknown, { dias }: { dias?: number }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return adminService.getAnaliticaClientes(dias ?? 30, ctx.prisma);
    },

    metricasRendimiento: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return snapshotMetricas();
    },
  },

  Mutation: {
    toggleActivoUsuario: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return adminService.toggleActivo(id, ctx.user!.id, ctx.prisma);
    },

    cambiarRolUsuario: (
      _: unknown,
      { id, rol }: { id: string; rol: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return adminService.cambiarRol(id, rol, ctx.user!.id, ctx.prisma);
    },
  },

  UsuarioAdmin: {
    perfilVendedor:  (u: { perfilVendedor?: { ratingPromedio?: { toString(): string } } | null }) =>
      u.perfilVendedor
        ? { ...u.perfilVendedor, ratingPromedio: u.perfilVendedor.ratingPromedio?.toString() ?? "0" }
        : null,
  },
};
