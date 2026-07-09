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
}

export function esVerificado(v: VendedorNivelData): boolean {
  return !!v.verificado || v.estadoVerificacion === "APROBADO";
}

export function nivelConfianza(v: VendedorNivelData): NivelConfianza {
  if (!esVerificado(v)) return "NUEVO";
  const ventas = v.totalVentas ?? 0;
  const rating = Number(v.ratingPromedio ?? 0);
  if (ventas >= 10 && rating >= 4.5) return "DESTACADO";
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
