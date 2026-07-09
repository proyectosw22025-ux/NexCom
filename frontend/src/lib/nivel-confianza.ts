/**
 * Escalera de confianza del vendedor (tiered trust). Se calcula desde datos que
 * el propio perfil ya expone; verificarse (KYC) es el salto de NUEVO a VERIFICADO,
 * y la trayectoria lo lleva a DESTACADO. Cada nivel desbloquea beneficios.
 */
export type NivelConfianza = "NUEVO" | "VERIFICADO" | "DESTACADO";

export interface VendedorNivelData {
  estadoVerificacion?: string | null;
  verificado?: boolean;
  totalVentas?: number;
  ratingPromedio?: string | number | null;
  disputasPerdidas?: number | null;
}

// Umbrales de reclamos (disputas resueltas a favor del comprador / ventas).
// Con menos de MIN_MUESTRA ventas no se juzga (muestra insuficiente).
const MIN_MUESTRA = 5;
const TASA_ALERTA = 0.15; // ≥15% → tienda "en observación"
const TASA_LIMPIA = 0.05; // <5%  → requisito para DESTACADO

export function esVerificado(v: VendedorNivelData): boolean {
  return !!v.verificado || v.estadoVerificacion === "APROBADO";
}

/** Tasa de reclamos perdidos (0..1). 0 si la muestra es insuficiente. */
export function tasaReclamos(v: VendedorNivelData): number {
  const ventas = v.totalVentas ?? 0;
  if (ventas < MIN_MUESTRA) return 0;
  return (v.disputasPerdidas ?? 0) / ventas;
}

/** Tienda con demasiados reclamos → pierde beneficios y se marca al comprador. */
export function reclamosAltos(v: VendedorNivelData): boolean {
  return tasaReclamos(v) >= TASA_ALERTA;
}

export function nivelConfianza(v: VendedorNivelData): NivelConfianza {
  if (!esVerificado(v)) return "NUEVO";
  const ventas = v.totalVentas ?? 0;
  const rating = Number(v.ratingPromedio ?? 0);
  // DESTACADO exige, además de trayectoria, una tasa de reclamos baja.
  if (ventas >= 10 && rating >= 4.5 && tasaReclamos(v) < TASA_LIMPIA) return "DESTACADO";
  return "VERIFICADO";
}

export const NIVELES: Record<NivelConfianza, {
  label: string; emoji: string; color: string; bg: string; beneficios: string[];
}> = {
  NUEVO: {
    label: "Nuevo", emoji: "🟠", color: "text-orange-600", bg: "bg-orange-50 border-orange-200",
    beneficios: ["Puedes vender y recibir pedidos", "Escrow libera tus fondos en 7 días"],
  },
  VERIFICADO: {
    label: "Verificado", emoji: "🔵", color: "text-sky-600", bg: "bg-sky-50 border-sky-200",
    beneficios: [
      "Sello “Vendedor verificado” en tu tienda y productos",
      "Puedes retirar tus fondos",
      "Mejor posición en el catálogo",
      "Escrow libera tus fondos en 3 días",
    ],
  },
  DESTACADO: {
    label: "Destacado", emoji: "🟣", color: "text-violet-600", bg: "bg-violet-50 border-violet-200",
    beneficios: [
      "Sello dorado “Tienda destacada”",
      "Máxima prioridad en el catálogo y búsqueda",
      "Escrow libera tus fondos en 24 h",
      "Prioridad en la cola de retiros",
    ],
  },
};
