import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon:      LucideIcon;
  titulo:    string;
  subtitulo?: string;
  accion?:   { label: string; href: string };
  className?: string;
}

/** Estado vacío consistente e ilustrado para listas/tablas. */
export function EmptyState({ icon: Icon, titulo, subtitulo, accion, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in ${className}`}>
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-indigo-100 rounded-2xl blur-xl opacity-40" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center">
          <Icon className="h-8 w-8 text-slate-300" />
        </div>
      </div>
      <p className="font-semibold text-slate-700">{titulo}</p>
      {subtitulo && <p className="text-sm text-slate-400 mt-1 max-w-xs">{subtitulo}</p>}
      {accion && (
        <Link
          href={accion.href}
          className="mt-5 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          {accion.label}
        </Link>
      )}
    </div>
  );
}
