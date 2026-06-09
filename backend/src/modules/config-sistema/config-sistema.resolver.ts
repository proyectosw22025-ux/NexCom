import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { configSistemaService } from "./config-sistema.service.js";

export const configSistemaResolvers = {
  Query: {
    configuracionSistema: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return configSistemaService.getAll(ctx.prisma);
    },

    configuracion: (_: unknown, { clave }: { clave: string }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return configSistemaService.getByClave(clave, ctx.prisma);
    },
  },

  Mutation: {
    actualizarConfig: (
      _: unknown,
      { clave, valor }: { clave: string; valor: string },
      ctx: NexComContext,
    ) => {
      requireRole(ctx, "ADMIN");
      return configSistemaService.update(clave, valor, ctx.prisma);
    },
  },

  ConfigSistema: {
    actualizadoEn: (c: { actualizadoEn: Date }) => c.actualizadoEn.toISOString(),
  },
};
