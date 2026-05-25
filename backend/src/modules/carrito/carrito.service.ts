import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { carritoRepository } from "./carrito.repository.js";

const MAX_CANTIDAD = 99;

export const carritoService = {
  async getCarrito(compradorId: string, prisma: PrismaClient) {
    return carritoRepository.findByCompradorId(compradorId, prisma);
  },

  async agregar(compradorId: string, productoId: string, cantidad: number, prisma: PrismaClient) {
    if (cantidad < 1 || !Number.isInteger(cantidad)) {
      throw new GraphQLError("La cantidad debe ser un número entero positivo.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto || !producto.activo) {
      throw new GraphQLError("Producto no disponible.", { extensions: { code: "NOT_FOUND" } });
    }
    if (producto.stock < cantidad) {
      throw new GraphQLError(
        `Stock insuficiente. Solo hay ${producto.stock} unidades disponibles.`,
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    const carritoId     = await carritoRepository.getCarritoId(compradorId, prisma);
    const precioSnapshot = new Decimal(producto.precio.toString());

    // Verificar stock incluyendo lo que ya está en el carrito
    const itemExistente = await prisma.itemCarrito.findUnique({
      where: { carritoId_productoId: { carritoId, productoId } },
    });
    const cantidadTotal = (itemExistente?.cantidad ?? 0) + cantidad;
    if (cantidadTotal > producto.stock) {
      throw new GraphQLError(
        `Stock insuficiente. Tienes ${itemExistente?.cantidad ?? 0} en el carrito y solo hay ${producto.stock} disponibles.`,
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }
    if (cantidadTotal > MAX_CANTIDAD) {
      throw new GraphQLError(`No puedes agregar más de ${MAX_CANTIDAD} unidades del mismo producto.`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    await carritoRepository.upsertItem(carritoId, productoId, cantidadTotal, precioSnapshot, prisma);
    return carritoRepository.getOrCreate(compradorId, prisma);
  },

  async actualizarCantidad(compradorId: string, productoId: string, cantidad: number, prisma: PrismaClient) {
    if (cantidad < 1 || !Number.isInteger(cantidad)) {
      throw new GraphQLError("La cantidad debe ser un número entero positivo.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto || !producto.activo) {
      throw new GraphQLError("Producto no disponible.", { extensions: { code: "NOT_FOUND" } });
    }
    if (cantidad > producto.stock) {
      throw new GraphQLError(
        `Stock insuficiente. Solo hay ${producto.stock} unidades disponibles.`,
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }
    if (cantidad > MAX_CANTIDAD) {
      throw new GraphQLError(`Máximo ${MAX_CANTIDAD} unidades por producto.`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const carritoId      = await carritoRepository.getCarritoId(compradorId, prisma);
    const precioSnapshot = new Decimal(producto.precio.toString());
    await carritoRepository.upsertItem(carritoId, productoId, cantidad, precioSnapshot, prisma);
    return carritoRepository.getOrCreate(compradorId, prisma);
  },

  async eliminar(compradorId: string, productoId: string, prisma: PrismaClient) {
    const carritoId = await carritoRepository.getCarritoId(compradorId, prisma);
    await carritoRepository.deleteItem(carritoId, productoId, prisma);
    return carritoRepository.getOrCreate(compradorId, prisma);
  },

  async vaciar(compradorId: string, prisma: PrismaClient): Promise<boolean> {
    const carritoId = await carritoRepository.getCarritoId(compradorId, prisma);
    await carritoRepository.clearItems(carritoId, prisma);
    return true;
  },
};
