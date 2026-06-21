import type { LucideIcon } from "lucide-react";

type Tono = "indigo" | "violet" | "emerald" | "slate";

const TONOS: Record<Tono, string> = {
  indigo:  "from-indigo-600 via-indigo-600 to-violet-600",
  violet:  "from-violet-600 via-purple-600 to-fuchsia-600",
  emerald: "from-emerald-600 via-teal-600 to-cyan-600",
  slate:   "from-slate-800 via-slate-800 to-slate-900",
};

interface PageHeroProps {
  titulo:    string;
  subtitulo?: string;
  icon?:     LucideIcon;
  tono?:     Tono;
  acciones?: React.ReactNode; // slot a la derecha (botones, filtros)
  children?: React.ReactNode; // contenido extra debajo (ej. chips)
}

/**
 * Encabezado tipo "hero" con degradado para los paneles. Da una primera impresión
 * de marca/profesionalismo y unifica la cabecera de los dashboards por rol.
 */
export function PageHero({ titulo, subtitulo, icon: Icon, tono = "indigo", acciones, children }: PageHeroProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${TONOS[tono]} px-6 py-6 mb-8 animate-fade-in`}>
      {/* Círculos decorativos sutiles */}
      <div className="pointer-events-none absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 right-24 w-36 h-36 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{titulo}</h1>
            {subtitulo && <p className="text-sm text-white/80 mt-0.5">{subtitulo}</p>}
          </div>
        </div>
        {acciones && <div className="shrink-0">{acciones}</div>}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </div>
  );
}
