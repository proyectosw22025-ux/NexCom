// Puntos de retiro por ciudad (zonas). Estáticos: el cliente elige dónde recoger
// su pedido cuando opta por "retiro en punto". Siempre incluye la opción de la tienda.

const EN_TIENDA = "En la tienda del vendedor";

const PUNTOS_POR_CIUDAD: Record<string, string[]> = {
  "Santa Cruz": ["Punto NexCom – Equipetrol", "Punto NexCom – Plan 3000", "Punto NexCom – Av. Banzer"],
  "La Paz":     ["Punto NexCom – Sopocachi", "Punto NexCom – Miraflores", "Punto NexCom – El Alto (Ceja)"],
  "Cochabamba": ["Punto NexCom – Cala Cala", "Punto NexCom – Av. América"],
  "Sucre":      ["Punto NexCom – Centro"],
  "Oruro":      ["Punto NexCom – Centro"],
  "Potosí":     ["Punto NexCom – Centro"],
  "Tarija":     ["Punto NexCom – Centro"],
  "Trinidad":   ["Punto NexCom – Centro"],
  "Cobija":     ["Punto NexCom – Centro"],
};

/** Opciones de retiro para una ciudad (zonas + tienda del vendedor). */
export function puntosDeRetiro(ciudad: string | null | undefined): string[] {
  const zonas = (ciudad && PUNTOS_POR_CIUDAD[ciudad.trim()]) || [];
  return [...zonas, EN_TIENDA];
}
