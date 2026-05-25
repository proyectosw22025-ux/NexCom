import Decimal from "decimal.js";

// Configuración global — precisión máxima, redondeo bancario
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function sumar(a: string, b: string): string {
  return new Decimal(a).plus(new Decimal(b)).toFixed(4);
}

export function restar(a: string, b: string): string {
  return new Decimal(a).minus(new Decimal(b)).toFixed(4);
}

export function multiplicar(a: string, b: string | number): string {
  return new Decimal(a).times(new Decimal(String(b))).toFixed(4);
}

export function dividir(a: string, b: string | number): string {
  return new Decimal(a).div(new Decimal(String(b))).toFixed(4);
}

// Calcula el total de una lista de items (precioUnitario × cantidad)
export function calcularSubtotalItems(
  items: Array<{ precioUnitario: string; cantidad: number }>
): string {
  return items
    .reduce((acc, item) => {
      const subtotalItem = new Decimal(item.precioUnitario).times(item.cantidad);
      return acc.plus(subtotalItem);
    }, new Decimal(0))
    .toFixed(4);
}

// Aplica un descuento porcentual: precio × (1 - descuento/100)
export function aplicarDescuentoPorcentaje(precio: string, porcentaje: string): string {
  const factor = new Decimal(1).minus(new Decimal(porcentaje).div(100));
  return new Decimal(precio).times(factor).toFixed(4);
}

// Recalcula el rating promedio de un vendedor sin pérdida de precisión
export function recalcularRating(ratingActual: string, totalResenias: number, nuevaCalificacion: number): string {
  if (totalResenias === 0) return new Decimal(nuevaCalificacion).toFixed(2);
  const sumaActual = new Decimal(ratingActual).times(totalResenias);
  return sumaActual
    .plus(nuevaCalificacion)
    .div(totalResenias + 1)
    .toFixed(2);
}
