import { GraphQLError } from "graphql";
import { requireAuth, requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { productosService } from "./productos.service.js";

type ProductoInput = {
  nombre: string; descripcion?: string; precio: string; stock: number;
  categoriaId: string; etiquetas?: string[]; imagenesUrl?: string[];
};
type ProductoUpdateInput = Omit<ProductoInput, "imagenesUrl">;

export const productosResolvers = {
  Query: {
    productos: (_: unknown, args: { pagina?: number; limite?: number; categoriaId?: string; soloActivos?: boolean }, ctx: NexComContext) =>
      productosService.getAll(args, ctx.prisma),

    producto: (_: unknown, { id }: { id: string }, ctx: NexComContext) =>
      productosService.getById(id, ctx.prisma),

    misProductos: (_: unknown, __: unknown, ctx: NexComContext) => {
      const user = requireRole(ctx, "VENDEDOR", "ADMIN");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return productosService.getMisProductos(ctx.user.perfilVendedorId, ctx.prisma);
    },
  },

  Mutation: {
    crearProducto: (_: unknown, { input }: { input: ProductoInput }, ctx: NexComContext) => {
      const user = requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return productosService.crear(input, ctx.user.perfilVendedorId, ctx.prisma);
    },

    actualizarProducto: (_: unknown, { id, input }: { id: string; input: ProductoUpdateInput }, ctx: NexComContext) => {
      const user = requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return productosService.actualizar(id, input, ctx.user.perfilVendedorId, ctx.prisma);
    },

    eliminarProducto: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return productosService.eliminar(id, ctx.user.perfilVendedorId!, ctx.prisma);
    },

    toggleDestacado: (_: unknown, { id }: { id: string }, ctx: NexComContext) => {
      requireRole(ctx, "ADMIN");
      return productosService.toggleDestacado(id, ctx.prisma);
    },

    agregarImagenes: (_: unknown, { productoId, urls }: { productoId: string; urls: string[] }, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      if (!ctx.user?.perfilVendedorId) {
        throw new GraphQLError("Perfil de vendedor no encontrado.", { extensions: { code: "NOT_FOUND" } });
      }
      return productosService.agregarImagenes(productoId, urls, ctx.user.perfilVendedorId, ctx.prisma);
    },

    eliminarImagen: (_: unknown, { imagenId }: { imagenId: string }, ctx: NexComContext) => {
      requireAuth(ctx);
      return productosService.eliminarImagen(imagenId, ctx.prisma);
    },
  },

  // Field resolvers — serialize Decimal as string
  Producto: {
    precio:   (p: { precio: { toString: () => string } }) => p.precio.toString(),
    creadoEn: (p: { creadoEn: Date }) => p.creadoEn.toISOString(),
  },
};
