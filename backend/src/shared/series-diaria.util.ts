/**
 * Utilidades para construir series temporales diarias a partir de una
 * agregación SQL (`GROUP BY date_trunc('day', …)`).
 *
 * El cálculo pesado vive en PostgreSQL: la query devuelve, como máximo, una
 * fila por día con actividad. Aquí solo rellenamos los huecos (días sin datos)
 * para que los gráficos dibujen una serie continua — operación O(dias), no
 * O(registros), por lo que escala sin importar el volumen de órdenes.
 */

export interface FilaSerieDia {
  fecha:   string; // "YYYY-MM-DD" (UTC)
  ordenes: number;
  total:   string; // Decimal serializado como texto
}

/** Fecha UTC de inicio del rango de `dias` (incluye hoy). */
export function rangoDesde(dias: number): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (dias - 1),
  ));
}

/**
 * Rellena con ceros los días sin actividad dentro del rango de `dias`.
 * Por defecto el rango termina hoy; `desdeArg` permite series sobre un rango
 * de fechas arbitrario (filtros personalizados de los reportes del admin).
 */
export function rellenarSerieDiaria(rows: FilaSerieDia[], dias: number, desdeArg?: Date): FilaSerieDia[] {
  const desde = desdeArg ?? rangoDesde(dias);
  const porFecha = new Map(rows.map((r) => [r.fecha, r]));
  const serie: FilaSerieDia[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(Date.UTC(
      desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate() + i,
    ));
    const key = d.toISOString().slice(0, 10);
    const found = porFecha.get(key);
    serie.push({ fecha: key, total: found?.total ?? "0", ordenes: found?.ordenes ?? 0 });
  }
  return serie;
}
