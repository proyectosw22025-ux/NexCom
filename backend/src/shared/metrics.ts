/**
 * Métricas de rendimiento por operación GraphQL, en memoria del proceso.
 *
 * Registra cada ejecución (duración + si tuvo errores) y calcula percentiles
 * sobre una muestra acotada por operación (últimas N duraciones) para no crecer
 * sin límite. Suficiente para observabilidad básica y el panel admin.
 *
 * Nota de escala: al ser por-proceso, con múltiples instancias cada una reporta
 * lo suyo. Para una vista global se agregaría en Redis/Prometheus (documentado).
 */

const MAX_MUESTRAS = 200;

interface OpStats {
  count:     number;
  errores:   number;
  totalMs:   number;
  ultimoMs:  number;
  muestras:  number[]; // duraciones recientes (para percentiles)
}

const store = new Map<string, OpStats>();
const inicio = Date.now();

export function registrarOperacion(operacion: string, ms: number, conError: boolean): void {
  let s = store.get(operacion);
  if (!s) {
    s = { count: 0, errores: 0, totalMs: 0, ultimoMs: 0, muestras: [] };
    store.set(operacion, s);
  }
  s.count   += 1;
  s.totalMs += ms;
  s.ultimoMs = ms;
  if (conError) s.errores += 1;
  s.muestras.push(ms);
  if (s.muestras.length > MAX_MUESTRAS) s.muestras.shift();
}

function percentil(ordenadas: number[], p: number): number {
  if (ordenadas.length === 0) return 0;
  const idx = Math.min(ordenadas.length - 1, Math.floor((p / 100) * ordenadas.length));
  return Math.round(ordenadas[idx]);
}

export interface MetricaOperacion {
  operacion:  string;
  count:      number;
  errores:    number;
  promedioMs: number;
  p50:        number;
  p95:        number;
  p99:        number;
}

export function snapshotMetricas(): { uptimeSegundos: number; operaciones: MetricaOperacion[] } {
  const operaciones: MetricaOperacion[] = [];
  for (const [operacion, s] of store.entries()) {
    const ordenadas = [...s.muestras].sort((a, b) => a - b);
    operaciones.push({
      operacion,
      count:      s.count,
      errores:    s.errores,
      promedioMs: Math.round(s.totalMs / s.count),
      p50:        percentil(ordenadas, 50),
      p95:        percentil(ordenadas, 95),
      p99:        percentil(ordenadas, 99),
    });
  }
  // Más usadas primero
  operaciones.sort((a, b) => b.count - a.count);
  return { uptimeSegundos: Math.round((Date.now() - inicio) / 1000), operaciones };
}
