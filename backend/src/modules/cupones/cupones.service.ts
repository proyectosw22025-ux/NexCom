import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { cuponesRepository } from "./cupones.repository.js";

export const cuponesService = {
  async getAll(prisma: PrismaClient) {
    return cuponesRepository.findAll(prisma);
  },

  async getCuponesVendedor(vendedorId: string, prisma: PrismaClient) {
    return cuponesRepository.findByVendedor(vendedorId, prisma);
  },

  async desactivar(id: string, rol: string, vendedorId: string | null, prisma: PrismaClient) {
    const cupon = await cuponesRepository.findById(id, prisma);
    if (!cupon) throw new GraphQLError("Cupón no encontrado.", { extensions: { code: "NOT_FOUND" } });
    // El vendedor solo puede desactivar sus propios cupones; el admin, cualquiera
    if (rol === "VENDEDOR" && cupon.vendedorId !== vendedorId) {
      throw new GraphQLError("No puedes modificar este cupón.", { extensions: { code: "FORBIDDEN" } });
    }
    return cuponesRepository.setActivo(id, false, prisma);
  },

  async crear(
    input: {
      codigo: string;
      tipo: string;
      valor: number;
      montoMinimo?: number | null;
      maxUsos?: number | null;
      fechaInicio: string;
      fechaFin: string;
    },
    prisma: PrismaClient,
    vendedorId?: string | null,
  ) {
    if (input.tipo !== "PORCENTAJE" && input.tipo !== "MONTO_FIJO") {
      throw new GraphQLError("El tipo debe ser PORCENTAJE o MONTO_FIJO.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (input.valor <= 0) {
      throw new GraphQLError("El valor del cupón debe ser mayor a 0.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (input.tipo === "PORCENTAJE" && input.valor > 100) {
      throw new GraphQLError("El porcentaje no puede superar 100%.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (input.montoMinimo != null && input.montoMinimo < 0) {
      throw new GraphQLError("El monto mínimo no puede ser negativo.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (input.maxUsos != null && input.maxUsos < 1) {
      throw new GraphQLError("El máximo de usos debe ser al menos 1.", {
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

    const existente = await cuponesRepository.findByCodigo(input.codigo.toUpperCase(), prisma);
    if (existente) {
      throw new GraphQLError("Ya existe un cupón con ese código.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    return cuponesRepository.create(
      {
        codigo:      input.codigo.toUpperCase(),
        tipo:        input.tipo,
        valor:       input.valor,
        montoMinimo: input.montoMinimo,
        maxUsos:     input.maxUsos,
        vendedorId:  vendedorId ?? null,
        fechaInicio: inicio,
        fechaFin:    fin,
      },
      prisma,
    );
  },

  async validar(
    codigo: string,
    subtotalStr: string,
    usuarioId: string,
    prisma: PrismaClient,
  ) {
    const cupon = await cuponesRepository.findByCodigo(codigo.toUpperCase(), prisma);
    if (!cupon || !cupon.activo) {
      throw new GraphQLError("Cupón no válido o inactivo.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const ahora = new Date();
    if (ahora < cupon.fechaInicio || ahora > cupon.fechaFin) {
      throw new GraphQLError("El cupón está fuera de su período de validez.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    if (cupon.maxUsos !== null && cupon.usosActuales >= cupon.maxUsos) {
      throw new GraphQLError("El cupón ha alcanzado su límite de usos.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const subtotal = new Decimal(subtotalStr);
    if (cupon.montoMinimo && subtotal.lt(cupon.montoMinimo)) {
      throw new GraphQLError(
        `El monto mínimo para este cupón es Bs. ${cupon.montoMinimo.toString()}.`,
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    const usosPrevios = await cuponesRepository.countUsosPorUsuario(cupon.id, usuarioId, prisma);
    if (usosPrevios > 0) {
      throw new GraphQLError("Ya usaste este cupón anteriormente.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const valor = new Decimal(cupon.valor.toString());
    let descuento: Decimal;
    if (cupon.tipo === "PORCENTAJE") {
      descuento = subtotal.mul(valor).div(100).toDecimalPlaces(4);
    } else {
      descuento = Decimal.min(valor, subtotal);
    }
    const totalConDescuento = subtotal.minus(descuento);

    return {
      cuponId:           cupon.id,
      codigo:            cupon.codigo,
      tipo:              cupon.tipo,
      valor:             valor.toString(),
      descuento:         descuento.toString(),
      totalConDescuento: totalConDescuento.toString(),
      // Uso interno (no expuesto en GraphQL): scope del cupón para que el
      // checkout verifique que aplica al vendedor de la orden. null = global.
      vendedorIdCupon:   cupon.vendedorId ?? null,
    };
  },
};
