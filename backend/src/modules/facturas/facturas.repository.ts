import type { PrismaClient } from "@prisma/client";
import type { Decimal } from "decimal.js";

const facturaInclude = {
  vendedor: { select: { nombreNegocio: true, ciudad: true } },
  orden:    { select: { items: { select: { nombreSnapshot: true, cantidad: true, precioUnitario: true, subtotal: true } } } },
};

export const facturasRepository = {
  async findOrdenParaFactura(ordenId: string, prisma: PrismaClient) {
    return prisma.orden.findUnique({
      where:  { id: ordenId },
      select: {
        id: true, estado: true, total: true,
        comprador: { select: { id: true } },
        vendedor:  { select: { id: true } },
        factura:   { select: { id: true } },
      },
    });
  },

  /** Crea la factura asignando el correlativo del vendedor de forma atómica. */
  async crear(
    data: {
      ordenId: string; vendedorId: string; compradorId: string;
      nitComprador: string; razonSocial: string; importeTotal: Decimal; iva: Decimal; codigoControl: string;
    },
    prisma: PrismaClient,
  ) {
    return prisma.$transaction(async (tx) => {
      const numero = (await tx.factura.count({ where: { vendedorId: data.vendedorId } })) + 1;
      return tx.factura.create({
        data: {
          ordenId:       data.ordenId,
          vendedorId:    data.vendedorId,
          compradorId:   data.compradorId,
          numero,
          nitComprador:  data.nitComprador,
          razonSocial:   data.razonSocial,
          importeTotal:  data.importeTotal.toString(),
          iva:           data.iva.toString(),
          codigoControl: data.codigoControl,
        },
        include: facturaInclude,
      });
    });
  },

  async findByOrden(ordenId: string, prisma: PrismaClient) {
    return prisma.factura.findUnique({ where: { ordenId }, include: facturaInclude });
  },
};
