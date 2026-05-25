import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { ofertasRepository } from "./ofertas.repository.js";

export const ofertasService = {
  async getActivas(prisma: PrismaClient) {
    return ofertasRepository.findActivas(prisma);
  },

  async getMisOfertas(vendedorId: string, prisma: PrismaClient) {
    return ofertasRepository.findByVendedor(vendedorId, prisma);
  },

  async crear(
    vendedorId: string,
    input: {
      titulo: string;
      descripcion?: string | null;
      descuento: number;
      fechaInicio: string;
      fechaFin: string;
      productoIds: string[];
    },
    prisma: PrismaClient,
  ) {
    if (input.descuento <= 0 || input.descuento > 100) {
      throw new GraphQLError("El descuento debe estar entre 1% y 100%.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    const inicio = new Date(input.fechaInicio);
    const fin    = new Date(input.fechaFin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      throw new GraphQLError("Las fechas son inválidas.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (fin <= inicio) {
      throw new GraphQLError("La fecha de fin debe ser posterior al inicio.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (input.productoIds.length === 0) {
      throw new GraphQLError("Debes incluir al menos un producto.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const productos = await prisma.producto.findMany({
      where:  { id: { in: input.productoIds }, vendedorId, activo: true },
      select: { id: true },
    });
    if (productos.length !== input.productoIds.length) {
      throw new GraphQLError("Uno o más productos no te pertenecen o no están activos.", {
        extensions: { code: "FORBIDDEN" },
      });
    }

    return ofertasRepository.create(
      vendedorId,
      {
        titulo:      input.titulo,
        descripcion: input.descripcion,
        descuento:   input.descuento,
        fechaInicio: inicio,
        fechaFin:    fin,
      },
      input.productoIds,
      prisma,
    );
  },

  async actualizar(
    id: string,
    vendedorId: string,
    input: {
      titulo?: string;
      descripcion?: string | null;
      descuento?: number;
      fechaFin?: string;
      productoIds?: string[];
    },
    prisma: PrismaClient,
  ) {
    const raw = await prisma.oferta.findUnique({
      where:  { id },
      select: { vendedorId: true, estado: true, fechaInicio: true },
    });
    if (!raw) {
      throw new GraphQLError("Oferta no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (raw.vendedorId !== vendedorId) {
      throw new GraphQLError("No tienes permiso para editar esta oferta.", { extensions: { code: "FORBIDDEN" } });
    }
    if (raw.estado === "CANCELADA" || raw.estado === "VENCIDA") {
      throw new GraphQLError("No se puede editar una oferta cancelada o vencida.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (input.descuento !== undefined && (input.descuento <= 0 || input.descuento > 100)) {
      throw new GraphQLError("El descuento debe estar entre 1% y 100%.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    let fechaFin: Date | undefined;
    if (input.fechaFin) {
      fechaFin = new Date(input.fechaFin);
      if (isNaN(fechaFin.getTime())) {
        throw new GraphQLError("La fecha de fin es inválida.", { extensions: { code: "BAD_USER_INPUT" } });
      }
      if (fechaFin <= raw.fechaInicio) {
        throw new GraphQLError("La fecha de fin debe ser posterior a la fecha de inicio.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
    }

    if (input.productoIds && input.productoIds.length > 0) {
      const productos = await prisma.producto.findMany({
        where:  { id: { in: input.productoIds }, vendedorId, activo: true },
        select: { id: true },
      });
      if (productos.length !== input.productoIds.length) {
        throw new GraphQLError("Uno o más productos no te pertenecen o no están activos.", {
          extensions: { code: "FORBIDDEN" },
        });
      }
    }

    return ofertasRepository.update(
      id,
      {
        titulo:      input.titulo,
        descripcion: input.descripcion,
        descuento:   input.descuento,
        fechaFin,
      },
      input.productoIds,
      prisma,
    );
  },

  async cancelar(id: string, vendedorId: string, prisma: PrismaClient) {
    const raw = await prisma.oferta.findUnique({
      where:  { id },
      select: { vendedorId: true, estado: true },
    });
    if (!raw) {
      throw new GraphQLError("Oferta no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (raw.vendedorId !== vendedorId) {
      throw new GraphQLError("No tienes permiso para cancelar esta oferta.", {
        extensions: { code: "FORBIDDEN" },
      });
    }
    if (raw.estado === "CANCELADA" || raw.estado === "VENCIDA") {
      throw new GraphQLError("La oferta ya está finalizada.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    return ofertasRepository.updateEstado(id, "CANCELADA", prisma);
  },
};
