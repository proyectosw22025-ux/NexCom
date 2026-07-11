"use client";

import { useQuery, gql } from "@apollo/client";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { ProductoCard, type ProductoCardData } from "./ProductoCard";
import { ProductoCardSkeleton } from "./ProductoCardSkeleton";

const FEED_PRODUCTOS = gql`
  query FeedProductos($limite: Int, $orden: OrdenProducto) {
    productos(pagina: 1, limite: $limite, soloActivos: true, orden: $orden) {
      items {
        id nombre descripcion precio stock activo destacado totalVendido
        categoria { id nombre slug }
        vendedor  { id nombreNegocio ratingPromedio totalResenias verificado }
        imagenes  { url orden }
        etiquetas { nombre }
      }
    }
  }
`;

/**
 * Feed de productos para el panel del cliente: lo primero que ve al entrar,
 * al estilo de un marketplace moderno (recomendados / lo más vendido).
 */
export function FeedProductos({ titulo = "Recomendados para ti", limite = 8, orden = "MAS_VENDIDOS" }:
  { titulo?: string; limite?: number; orden?: "MAS_VENDIDOS" | "RECIENTES" }) {
  const { data, loading } = useQuery<{ productos: { items: ProductoCardData[] } }>(FEED_PRODUCTOS, {
    variables: { limite, orden }, fetchPolicy: "cache-and-network",
  });
  const productos = data?.productos?.items ?? [];

  if (!loading && productos.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{titulo}</h2>
            <p className="text-xs text-slate-400">Descubre lo mejor del marketplace</p>
          </div>
        </div>
        <Link
          href="/productos"
          className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Ver catálogo
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && productos.length === 0
          ? Array.from({ length: limite }).map((_, i) => <ProductoCardSkeleton key={i} />)
          : productos.map((p, index) => <ProductoCard key={p.id} producto={p} index={index} />)}
      </div>
    </section>
  );
}
