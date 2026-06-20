// Campañas de temporada bolivianas. El banner se activa automáticamente según la
// fecha actual (sin configuración externa). Día/mes inclusivos.

export interface Campania {
  id:       string;
  nombre:   string;
  emoji:    string;
  mensaje:  string;
  cta:      string;
  href:     string;
  gradient: string; // clases tailwind del fondo
  desde:    { mes: number; dia: number };
  hasta:    { mes: number; dia: number };
}

const CAMPANIAS: Campania[] = [
  {
    id: "amistad", nombre: "Día del Amor y la Amistad", emoji: "💖",
    mensaje: "Detalles para quien quieres", cta: "Ver ideas",
    href: "/productos?orden=MAS_VENDIDOS", gradient: "from-rose-500 to-pink-600",
    desde: { mes: 2, dia: 8 }, hasta: { mes: 2, dia: 14 },
  },
  {
    id: "padre", nombre: "Día del Padre", emoji: "👔",
    mensaje: "El regalo perfecto para papá", cta: "Ver ideas",
    href: "/productos?orden=MAS_VENDIDOS", gradient: "from-sky-600 to-indigo-700",
    desde: { mes: 3, dia: 13 }, hasta: { mes: 3, dia: 19 },
  },
  {
    id: "nino", nombre: "Día del Niño", emoji: "🎈",
    mensaje: "Sorprende a los más pequeños", cta: "Explorar",
    href: "/productos?orden=MAS_VENDIDOS", gradient: "from-cyan-500 to-blue-600",
    desde: { mes: 4, dia: 6 }, hasta: { mes: 4, dia: 12 }, // Día del Niño en Bolivia: 12 de abril
  },
  {
    id: "madre", nombre: "Día de la Madre", emoji: "💐",
    mensaje: "Encuentra el regalo perfecto para mamá", cta: "Ver ideas",
    href: "/productos?orden=MAS_VENDIDOS", gradient: "from-fuchsia-500 to-rose-600",
    desde: { mes: 5, dia: 20 }, hasta: { mes: 5, dia: 27 }, // Día de la Madre en Bolivia: 27 de mayo
  },
  {
    id: "sanjuan", nombre: "Noche de San Juan", emoji: "🔥",
    mensaje: "Todo para tu fogata y parrillada", cta: "Explorar",
    href: "/productos", gradient: "from-amber-500 to-orange-600",
    desde: { mes: 6, dia: 18 }, hasta: { mes: 6, dia: 24 },
  },
  {
    id: "ferias", nombre: "Temporada de Ferias", emoji: "🎪",
    mensaje: "Lo mejor de las microempresas bolivianas", cta: "Descubrir",
    href: "/productos?orden=MAS_VENDIDOS", gradient: "from-violet-600 to-indigo-700",
    desde: { mes: 9, dia: 18 }, hasta: { mes: 9, dia: 30 }, // temporada EXPOCRUZ
  },
  {
    id: "navidad", nombre: "Navidad", emoji: "🎄",
    mensaje: "Regalos y todo para las fiestas", cta: "Ver ideas",
    href: "/productos?orden=MAS_VENDIDOS", gradient: "from-emerald-600 to-red-600",
    desde: { mes: 12, dia: 1 }, hasta: { mes: 12, dia: 25 },
  },
];

/** Devuelve la campaña activa para la fecha dada, o null si no hay ninguna. */
export function campaniaActiva(now: Date = new Date()): Campania | null {
  const mes = now.getMonth() + 1;
  const dia = now.getDate();
  const valor = mes * 100 + dia; // p.ej. 24 jun → 624
  for (const c of CAMPANIAS) {
    const desde = c.desde.mes * 100 + c.desde.dia;
    const hasta = c.hasta.mes * 100 + c.hasta.dia;
    if (valor >= desde && valor <= hasta) return c;
  }
  return null;
}
