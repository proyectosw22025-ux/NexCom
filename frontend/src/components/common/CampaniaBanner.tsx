
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { campaniaActiva } from "@/lib/campanias";


/**
 * Banner de temporada (modo feria). Se renderiza en el servidor según la fecha
 * actual; si no hay campaña activa, no muestra nada.
 */
export function CampaniaBanner() {
  const campania = campaniaActiva();
  if (!campania) return null;

  return (
    <Link
      href={campania.href}
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-r ${campania.gradient} px-5 py-4 mb-6 shadow-sm`}
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl sm:text-4xl shrink-0" aria-hidden>{campania.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{campania.nombre}</p>
          <p className="text-sm sm:text-base font-bold text-white truncate">{campania.mensaje}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0">
          {campania.cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}


