import { GraphQLError } from "graphql";
import type { NexComContext } from "../../shared/types/context.type.js";
import { requireAuth, requireRole } from "../../shared/guards.js";
import * as service from "./auth.service.js";

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: NexComContext) => {
      const user = requireAuth(ctx);
      return service.getMe(user.id, ctx.prisma);
    },

    // Perfil público de un vendedor (tienda) — sin auth
    vendedorPublico: (_: unknown, { id }: { id: string }, ctx: NexComContext) =>
      service.getVendedorPublico(id, ctx.prisma),
  },

  Mutation: {
    mejorarPlan: (_: unknown, { plan }: { plan: string }, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return service.mejorarPlan(ctx.user.perfilVendedorId, plan, ctx.prisma);
    },

    register: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: NexComContext
    ) => {
      const dispositivo = "web";
      return service.register(input, ctx.prisma, dispositivo);
    },

    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
      ctx: NexComContext
    ) => {
      return service.login({ email, password }, ctx.prisma, "web");
    },

    logout: async (
      _: unknown,
      { refreshToken }: { refreshToken?: string },
      ctx: NexComContext
    ) => {
      requireAuth(ctx);
      if (!refreshToken) return true;
      return service.logout(refreshToken, ctx.prisma);
    },

    refreshToken: async (
      _: unknown,
      { token }: { token: string },
      ctx: NexComContext
    ) => {
      return service.refreshToken(token, ctx.prisma, "web");
    },

    verifyEmail: async (
      _: unknown,
      { token }: { token: string },
      ctx: NexComContext
    ) => {
      return service.verifyEmail(token, ctx.prisma);
    },

    requestPasswordReset: async (
      _: unknown,
      { email }: { email: string },
      ctx: NexComContext
    ) => {
      return service.requestPasswordReset(email, ctx.prisma);
    },

    resetPassword: async (
      _: unknown,
      { token, nuevaPassword }: { token: string; nuevaPassword: string },
      ctx: NexComContext
    ) => {
      return service.resetPassword(token, nuevaPassword, ctx.prisma);
    },

    updatePassword: async (
      _: unknown,
      { passwordActual, nuevaPassword }: { passwordActual: string; nuevaPassword: string },
      ctx: NexComContext
    ) => {
      const user = requireAuth(ctx);
      return service.updatePassword(user.id, passwordActual, nuevaPassword, ctx.prisma);
    },
  },

  // Resolvers de campos calculados para UsuarioPublico
  UsuarioPublico: {
    creadoEn: (parent: { creadoEn: Date }) => parent.creadoEn.toISOString(),
  },
};
