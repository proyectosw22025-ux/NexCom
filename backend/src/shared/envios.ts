import { Decimal } from "decimal.js";

// Costo de envío a domicilio por departamento (Bs.). Eje central más barato.
const EJE_CENTRAL = ["Santa Cruz", "La Paz", "Cochabamba"];
const COSTO_EJE   = new Decimal(15);
const COSTO_RESTO = new Decimal(25);

/**
 * Costo de envío de UNA orden (por vendedor). "retiro_tienda" es gratis;
 * "domicilio" cobra según el departamento de la dirección.
 */
export function costoEnvio(departamento: string | null | undefined, metodoEntrega: string): Decimal {
  if (metodoEntrega === "retiro_tienda") return new Decimal(0);
  const depto = (departamento ?? "").trim();
  return EJE_CENTRAL.includes(depto) ? COSTO_EJE : COSTO_RESTO;
}

export const METODOS_ENTREGA = ["domicilio", "retiro_tienda"];
