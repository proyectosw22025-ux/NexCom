import crypto from "crypto";
import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { facturasRepository } from "./facturas.repository.js";

const IVA_DIVISOR = new Decimal(1.13); // IVA 13% "por dentro" (el precio ya lo incluye)
// Una factura solo se emite sobre una orden ya pagada
const ESTADOS_NO_FACTURABLES = ["PENDIENTE_PAGO", "CANCELADO"];

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

/** Código de control simulado (estilo SIN): 4 pares hex separados por guion. */
function generarCodigoControl() {
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return hex.match(/.{1,2}/g)!.join("-");
}

type FacturaRow = {
  id: string; numero: number; nitComprador: string; razonSocial: string;
  importeTotal: { toString(): string }; iva: { toString(): string }; codigoControl: string; fechaEmision: Date;
  vendedor: { nombreNegocio: string; ciudad: string };
  orden: { items: { nombreSnapshot: string; cantidad: number; precioUnitario: { toString(): string }; subtotal: { toString(): string } }[] };
};

function mapFactura(f: FacturaRow) {
  const total = new Decimal(f.importeTotal.toString());
  const iva   = new Decimal(f.iva.toString());
  return {
    id:            f.id,
    numero:        f.numero,
    nitComprador:  f.nitComprador,
    razonSocial:   f.razonSocial,
    importeTotal:  total.toFixed(2),
    neto:          total.minus(iva).toFixed(2),
    iva:           iva.toFixed(2),
    codigoControl: f.codigoControl,
    fechaEmision:  f.fechaEmision.toISOString(),
    emisorNombre:  f.vendedor.nombreNegocio,
    emisorCiudad:  f.vendedor.ciudad,
    items: f.orden.items.map((it) => ({
      nombre: it.nombreSnapshot, cantidad: it.cantidad,
      precioUnitario: new Decimal(it.precioUnitario.toString()).toFixed(2),
      subtotal: new Decimal(it.subtotal.toString()).toFixed(2),
    })),
  };
}

export const facturasService = {
  async solicitar(
    compradorId: string,
    ordenId: string,
    nitComprador: string,
    razonSocial: string,
    prisma: PrismaClient,
  ) {
    const nit   = nitComprador.trim();
    const razon = razonSocial.trim();
    if (!nit)   throw bad("Ingresa el NIT o CI (usa 0 para “sin nombre”).");
    if (!razon) throw bad("Ingresa la razón social o nombre.");
    if (!/^\d{1,15}$/.test(nit)) throw bad("El NIT/CI debe ser numérico.");

    const orden = await facturasRepository.findOrdenParaFactura(ordenId, prisma);
    if (!orden || orden.comprador?.id !== compradorId) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (ESTADOS_NO_FACTURABLES.includes(orden.estado)) {
      throw bad("Solo puedes facturar una orden ya pagada.");
    }
    if (orden.factura) {
      throw bad("Esta orden ya tiene una factura emitida.");
    }

    const total = new Decimal(orden.total.toString());
    const neto  = total.div(IVA_DIVISOR).toDecimalPlaces(2);
    const iva   = total.minus(neto);

    const factura = await facturasRepository.crear(
      {
        ordenId, vendedorId: orden.vendedor!.id, compradorId,
        nitComprador: nit, razonSocial: razon,
        importeTotal: total, iva, codigoControl: generarCodigoControl(),
      },
      prisma,
    );
    return mapFactura(factura as FacturaRow);
  },

  async getByOrden(ordenId: string, compradorId: string, prisma: PrismaClient) {
    const f = await facturasRepository.findByOrden(ordenId, prisma);
    if (!f || f.compradorId !== compradorId) return null;
    return mapFactura(f as unknown as FacturaRow);
  },
};
