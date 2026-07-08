import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";

/**
 * Precio efectivo de un producto aplicando su MEJOR oferta ACTIVA vigente
 * (mayor descuento). Si no hay oferta vigente devuelve el precio base.
 *
 * Punto único de verdad para el precio con descuento: lo usa el carrito al
 * fijar el `precioSnapshot`, de modo que la oferta fluye correctamente hacia
 * la orden, el total y el escrow (que se construyen desde ese snapshot).
 */
export async function precioEfectivo(
  productoId: string,
  precioBase: Decimal,
  prisma: PrismaClient,
): Promise<Decimal> {
  const ahora = new Date();
  const ofertas = await prisma.ofertaProducto.findMany({
    where: {
      productoId,
      oferta: { estado: "ACTIVA", fechaInicio: { lte: ahora }, fechaFin: { gte: ahora } },
    },
    select: { oferta: { select: { descuento: true } } },
  });
  if (ofertas.length === 0) return precioBase;

  let maxDesc = new Decimal(0);
  for (const o of ofertas) {
    const d = new Decimal(o.oferta.descuento.toString());
    if (d.gt(maxDesc)) maxDesc = d;
  }
  return precioBase.mul(new Decimal(100).minus(maxDesc)).div(100).toDecimalPlaces(4);
}
