"use client";

import { useQuery } from "@apollo/client";
import { Sparkles } from "lucide-react";
import { PRODUCTOS_RECOMENDADOS } from "@/graphql/productos/queries";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoCardSkeleton } from "@/components/productos/ProductoCardSkeleton";

/**
 * "También te puede interesar": recomendaciones por co-ocurrencia en órdenes
 * (calculadas en el backend con SQL + fallback por categoría).
 */
export function ProductosRecomendados({ productoId }: { productoId: string }) {
  const { data, loading } = useQuery<{ productosRecomendados: ProductoCardData[] }>(
    PRODUCTOS_RECOMENDADOS,
    { variables: { productoId, limite: 4 }, fetchPolicy: "cache-first" },
  );

  const recomendados = data?.productosRecomendados ?? [];

  // No mostrar la sección si no hay recomendaciones (evita ruido visual)
  if (!loading && recomendados.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">También te puede interesar</h2>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ProductoCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {recomendados.map((p, i) => <ProductoCard key={p.id} producto={p} index={i} />)}
        </div>
      )}
    </section>
  );
}
