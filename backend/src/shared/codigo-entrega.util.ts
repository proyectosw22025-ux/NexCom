import { randomInt } from "node:crypto";

/**
 * Genera un código de entrega de 6 dígitos con CSPRNG. El cliente lo ve en el
 * detalle de su orden (QR + PIN) y lo entrega al recibir el producto para liberar
 * los fondos retenidos. Es de un solo uso por orden.
 */
export function generarCodigoEntrega(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
