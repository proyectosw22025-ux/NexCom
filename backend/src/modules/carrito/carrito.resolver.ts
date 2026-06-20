import { GraphQLError } from "graphql";
import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { carritoService } from "./carrito.service.js";

function getCompradorId(ctx: NexComContext): string {
  requireRole(ctx, "COMPRADOR");
  if (!ctx.user?.perfilCompradorId) {
    throw new GraphQLError("Perfil de comprador no encontrado.", { extensions: { code: "NOT_FOUND" } });
  }
  return ctx.user.perfilCompradorId;
}

export const carritoResolvers = {
  Query: {
    miCarrito: (_: unknown, __: unknown, ctx: NexComContext) =>
      carritoService.getCarrito(getCompradorId(ctx), ctx.prisma),

    misGuardados: (_: unknown, __: unknown, ctx: NexComContext) =>
      carritoService.getGuardados(getCompradorId(ctx), ctx.prisma),
  },

  Mutation: {
    agregarAlCarrito: (
      _: unknown,
      { productoId, cantidad }: { productoId: string; cantidad: number },
      ctx: NexComContext,
    ) => carritoService.agregar(getCompradorId(ctx), productoId, cantidad, ctx.prisma),

    actualizarCantidad: (
      _: unknown,
      { productoId, cantidad }: { productoId: string; cantidad: number },
      ctx: NexComContext,
    ) => carritoService.actualizarCantidad(getCompradorId(ctx), productoId, cantidad, ctx.prisma),

    eliminarDelCarrito: (
      _: unknown,
      { productoId }: { productoId: string },
      ctx: NexComContext,
    ) => carritoService.eliminar(getCompradorId(ctx), productoId, ctx.prisma),

    vaciarCarrito: (_: unknown, __: unknown, ctx: NexComContext) =>
      carritoService.vaciar(getCompradorId(ctx), ctx.prisma),

    guardarParaDespues: (_: unknown, { productoId }: { productoId: string }, ctx: NexComContext) =>
      carritoService.guardarParaDespues(getCompradorId(ctx), productoId, ctx.prisma),

    moverAlCarrito: (_: unknown, { productoId }: { productoId: string }, ctx: NexComContext) =>
      carritoService.moverAlCarrito(getCompradorId(ctx), productoId, ctx.prisma),

    quitarGuardado: (_: unknown, { productoId }: { productoId: string }, ctx: NexComContext) =>
      carritoService.quitarGuardado(getCompradorId(ctx), productoId, ctx.prisma),
  },
};
