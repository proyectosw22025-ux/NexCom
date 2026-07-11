"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { MIS_FAVORITOS } from "@/graphql/favoritos/queries";
import { useAuth } from "@/context/auth-context";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoCardSkeleton } from "@/components/productos/ProductoCardSkeleton";

interface Favorito {
  id:       string;
  creadoEn: string;
  producto: ProductoCardData;
}

export default function FavoritosPage() {
  const { user, isLoading: authLoading } = useAuth();

  const { data, loading } = useQuery<{ misFavoritos: Favorito[] }>(MIS_FAVORITOS, {
    fetchPolicy: "cache-and-network",
    skip: !user || user.rol !== "CLIENTE",
  });

  const favoritos = data?.misFavoritos ?? [];

  // No autenticado o no comprador
  if (!authLoading && (!user || user.rol !== "CLIENTE")) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Heart className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tus favoritos</h1>
        <p className="text-sm text-slate-500 mb-6">
          Inicia sesión como cliente para guardar y ver tus productos favoritos.
        </p>
        <Link
          href="/login?redirect=/favoritos"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
          <Heart className="h-4.5 w-4.5 text-red-500 fill-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mis favoritos</h1>
          {!loading && (
            <p className="text-sm text-slate-400">
              {favoritos.length} producto{favoritos.length !== 1 ? "s" : ""} guardado{favoritos.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {authLoading || (loading && !data) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductoCardSkeleton key={i} />)}
        </div>
      ) : favoritos.length === 0 ? (
        <div className="text-center py-24">
          <Heart className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">Aún no tienes favoritos</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            Toca el corazón en cualquier producto para guardarlo aquí
          </p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                       hover:text-indigo-700 transition-colors"
          >
            Explorar el catálogo →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {favoritos.map((f, index) => (
            <ProductoCard key={f.id} producto={f.producto} index={index} initialFavorito />
          ))}
        </div>
      )}
    </div>
  );
}
