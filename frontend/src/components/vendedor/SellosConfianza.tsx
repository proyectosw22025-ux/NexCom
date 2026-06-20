import { BadgeCheck, Star, Zap } from "lucide-react";

interface SellosConfianzaProps {
  verificado?:    boolean;
  ciudad?:        string;
  ratingPromedio?: string | number;
  totalResenias?: number;
  respondeRapido?: boolean;
  size?:          "sm" | "md";
}

/**
 * Sellos de confianza del vendedor (diferenciación local). Cada sello se deriva de
 * datos reales: verificación de admin, valoraciones y velocidad de respuesta.
 */
export function SellosConfianza({
  verificado, ciudad, ratingPromedio, totalResenias = 0, respondeRapido, size = "md",
}: SellosConfianzaProps) {
  const rating = typeof ratingPromedio === "string" ? parseFloat(ratingPromedio) : (ratingPromedio ?? 0);
  const bienValorado = rating >= 4.5 && totalResenias >= 3;

  const sellos: { icon: typeof Star; label: string; clase: string }[] = [];
  if (verificado) {
    sellos.push({
      icon: BadgeCheck,
      label: ciudad ? `Microempresa verificada · ${ciudad}` : "Microempresa verificada",
      clase: "bg-emerald-50 text-emerald-700 border-emerald-200",
    });
  }
  if (bienValorado) {
    sellos.push({ icon: Star, label: "Bien valorado", clase: "bg-amber-50 text-amber-700 border-amber-200" });
  }
  if (respondeRapido) {
    sellos.push({ icon: Zap, label: "Responde rápido", clase: "bg-indigo-50 text-indigo-700 border-indigo-200" });
  }

  if (sellos.length === 0) return null;

  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const ic  = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sellos.map((s) => {
        const Icono = s.icon;
        return (
          <span key={s.label} className={`inline-flex items-center gap-1 font-semibold rounded-full border ${s.clase} ${pad}`}>
            <Icono className={ic} /> {s.label}
          </span>
        );
      })}
    </div>
  );
}
