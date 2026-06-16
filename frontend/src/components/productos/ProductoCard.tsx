"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart, Package, CheckCircle, Star } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useMutation } from "@apollo/client";
import { TOGGLE_FAVORITO } from "@/graphql/favoritos/mutations";
import { useState } from "react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import { Badge } from "@/components/ui/Badge";

export interface ProductoCardData {
  id:          string;
  nombre:      string;
  precio:      string;
  stock:       number;
  activo:      boolean;
  destacado:   boolean;
  descripcion?: string | null;
  categoria:   { id: string; nombre: string; slug: string };
  vendedor:    { id?: string; nombreNegocio: string; ratingPromedio?: string; totalResenias?: number };
  imagenes:    { url: string; orden: number }[];
  etiquetas:   { nombre: string }[];
}

export function ProductoCard({ producto, index, initialFavorito = false }: { producto: ProductoCardData; index?: number; initialFavorito?: boolean }) {
  const { user } = useAuth();
  const { agregar } = useCart();
  const [adding, setAdding]         = useState(false);
  const [added, setAdded]           = useState(false);
  const [favorito, setFavorito]     = useState(initialFavorito);
  const [imgLoaded, setImgLoaded]   = useState(false);

  const [toggleFavorito] = useMutation(TOGGLE_FAVORITO);

  const imgUrl = producto.imagenes.sort((a, b) => a.orden - b.orden)[0]?.url;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/login"; return; }
    if (user.rol !== "COMPRADOR") { toast.error("Solo compradores pueden agregar al carrito."); return; }
    setAdding(true);
    await agregar(producto.id, 1);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  async function handleToggleFav(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/login"; return; }
    if (user.rol !== "COMPRADOR") { toast.error("Solo compradores pueden guardar favoritos."); return; }
    try {
      const { data } = await toggleFavorito({ variables: { productoId: producto.id } });
      setFavorito(data?.toggleFavorito ?? false);
      toast.success(favorito ? "Eliminado de favoritos." : "Guardado en favoritos.");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error.")
        : "Error.";
      toast.error(msg);
    }
  }

  return (
    <Link
      href={`/productos/${producto.id}`}
      style={{ animationDelay: `${(index ?? 0) * 55}ms` }}
      className="animate-stagger-fade-up group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300 transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={producto.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={() => setImgLoaded(true)}
            className={`object-cover group-hover:scale-105 transition-all duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-slate-300" />
          </div>
        )}
        {producto.destacado && (
          <div className="absolute top-2 left-2">
            <Badge variant="destacado" size="sm" dot />
          </div>
        )}
        {user?.rol === "COMPRADOR" && (
          <button
            onClick={handleToggleFav}
            className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full
                       flex items-center justify-center hover:bg-white shadow-sm transition-colors"
          >
            <Heart className={`h-4 w-4 transition-colors ${favorito ? "text-red-500 fill-red-500" : "text-slate-400"}`} />
          </button>
        )}
        {producto.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          {producto.categoria.nombre}
        </p>
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
          {producto.nombre}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400 truncate">{producto.vendedor.nombreNegocio}</p>
          {(producto.vendedor.totalResenias ?? 0) > 0 && producto.vendedor.ratingPromedio && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 shrink-0">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              {parseFloat(producto.vendedor.ratingPromedio).toFixed(1)}
              <span className="text-slate-300 font-normal">({producto.vendedor.totalResenias})</span>
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold text-slate-900">Bs. {producto.precio}</p>
            {producto.stock === 0 ? (
              <Badge variant="sin-stock" size="sm" />
            ) : producto.stock <= 5 ? (
              <Badge variant="stock-bajo" size="sm" label={`${producto.stock} restantes`} />
            ) : null}
          </div>
          {user?.rol === "COMPRADOR" && producto.stock > 0 && (
            <button
              onClick={handleAddToCart}
              disabled={adding || added}
              className={`shrink-0 flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2 rounded-xl
                         transition-colors shadow-sm ${
                           added
                             ? "bg-emerald-500 shadow-emerald-200"
                             : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-indigo-200"
                         }`}
            >
              {added
                ? <><CheckCircle className="h-3.5 w-3.5" /> ¡Listo!</>
                : adding
                  ? "…"
                  : <><ShoppingCart className="h-3.5 w-3.5" /> Agregar</>
              }
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
