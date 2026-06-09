import { requireAuth, requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { reportesService } from "./reportes.service.js";
import type { EstadoReporte, TipoReporte } from "@prisma/client";

export const reportesResolvers = {
  Query: {
    reportes: (
      _: unknown,
      args: { estado?: EstadoReporte; tipo?: TipoReporte; pagina?: number; limite?: number },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return reportesService.getReportes(args, ctx.prisma);
    },
  },

  Mutation: {
    crearReporte: (
      _: unknown,
      args: { tipo: TipoReporte; referenciaId: string; motivo: string; descripcion?: string },
      ctx: NexComContext,
    ) => {
      const user = requireAuth(ctx);
      return reportesService.crearReporte(
        user.id, args.tipo, args.referenciaId, args.motivo, args.descripcion, ctx.prisma,
      );
    },

    resolverReporte: (
      _: unknown,
      { id, estado, resolucion }: { id: string; estado: EstadoReporte; resolucion: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return reportesService.resolverReporte(id, estado, resolucion, ctx.user!.id, ctx.prisma);
    },
  },

  Reporte: {
    creadoEn:   (r: { creadoEn: Date }) => r.creadoEn.toISOString(),
    resueltoEn: (r: { resueltoEn: Date | null }) => r.resueltoEn?.toISOString() ?? null,
  },
};
