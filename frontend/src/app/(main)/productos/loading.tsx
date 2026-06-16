import { Filter } from "lucide-react";
import { ProductoCardSkeleton } from "@/components/productos/ProductoCardSkeleton";

// Next muestra este skeleton automáticamente (Suspense de la ruta) mientras el
// Server Component obtiene los datos y al navegar entre categorías/páginas.
export default function ProductosLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-slate-300" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Categorías</h2>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Catálogo</h1>
            <div className="h-4 w-24 rounded bg-slate-100 animate-pulse mt-1.5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <ProductoCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
