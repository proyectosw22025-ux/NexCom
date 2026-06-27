/**
 * Scoring de riesgo de un vendedor (antifraude). Combina señales de comportamiento
 * en un puntaje 0–100 (mayor = más riesgo) y un nivel para revisión del admin.
 *
 * Señales (todas derivadas de datos ya existentes — sin dependencias externas):
 *  - Tasa de cancelación (órdenes canceladas / total).
 *  - Tasa de disputas (reclamos / total de órdenes).
 *  - Disputas resueltas a favor del comprador (señal fuerte de fraude/mal servicio).
 *  - Falta de verificación (KYC).
 */
export interface SenalesRiesgo {
  total: number;
  cancelados: number;
  disputas: number;
  disputasPerdidas: number;
  verificado: boolean;
}

export interface Riesgo {
  score: number;
  nivel: "BAJO" | "MEDIO" | "ALTO";
  factores: string[];
}

export function calcularRiesgoVendedor(s: SenalesRiesgo): Riesgo {
  const total       = Math.max(1, s.total);
  const tasaCancel  = s.cancelados / total;
  const tasaDisputa = s.disputas / total;
  const factores: string[] = [];
  let score = 0;

  score += Math.min(40, tasaCancel * 80);
  if (tasaCancel > 0.2) factores.push("Alta tasa de cancelación");

  score += Math.min(35, tasaDisputa * 120);
  if (tasaDisputa > 0.1) factores.push("Reclamos frecuentes");

  score += Math.min(20, s.disputasPerdidas * 10);
  if (s.disputasPerdidas > 0) factores.push(`${s.disputasPerdidas} disputa(s) a favor del comprador`);

  if (!s.verificado) {
    score += 10;
    factores.push("Sin verificación (KYC)");
  }

  score = Math.round(Math.min(100, score));
  const nivel = score >= 60 ? "ALTO" : score >= 30 ? "MEDIO" : "BAJO";
  return { score, nivel, factores };
}
