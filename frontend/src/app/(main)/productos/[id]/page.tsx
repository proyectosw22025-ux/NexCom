"use client";

import { useQuery } from "@apollo/client";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PRODUCTO } from "@/graphql/productos/queries";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import {
  ShoppingCart, Package, Store, Tag,
  Minus, Plus, Loader2, CheckCircle, ChevronRight, Flag,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProductoResenias } from "@/components/productos/ProductoResenias";
import { ProductosRecomendados } from "@/components/productos/ProductosRecomendados";
import { ReportarDialog } from "@/components/reportes/ReportarDialog";
import { toast } from "sonner";
import type { ProductoCardData } from "@/components/productos/ProductoCard";

export default function ProductoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { agregar } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded]   = useState(false);

  const { data, loading } = useQuery<{ producto: ProductoCardData | null }>(PRODUCTO, {
    variables: { id },
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Cargando producto…</p>
      </div>
    );
  }

  const p = data?.producto;
  if (!p) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Producto no encontrado</h1>
        <Link href="/productos" className="text-indigo-600 hover:underline text-sm">
          ← Volver al catálogo
        </Link>
      </div>
    );
  }

  const imagenes = [...p.imagenes].sort((a, b) => a.orden - b.orden);
  const imgUrl   = imagenes[selectedImg]?.url;

  async function handleAddToCart() {
    if (!user) { window.location.href = "/login"; return; }
    if (user.rol !== "COMPRADOR") { toast.error("Solo compradores pueden agregar al carrito."); return; }
    setAdding(true);
    await agregar(p!.id, cantidad);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-6 flex-wrap">
        <Link href="/productos" className="hover:text-slate-600 transition-colors">Productos</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href={`/categoria/${p.categoria.slug}`} className="hover:text-slate-600 transition-colors">
          {p.categoria.nombre}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-slate-600 truncate max-w-[220px]">{p.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            {imgUrl ? (
              <Image src={imgUrl} alt={p.nombre} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-16 w-16 text-slate-300" />
              </div>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2">
              {imagenes.map((img, i) => (
                <button
                  key={img.url}
                  onClick={() => setSelectedImg(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                    selectedImg === i ? "border-indigo-500" : "border-slate-200"
                  }`}
                >
                  <Image src={img.url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            <Link href={`/categoria/${p.categoria.slug}`} className="text-xs font-semibold text-indigo-600 uppercase tracking-wide hover:underline">
              {p.categoria.nombre}
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{p.nombre}</h1>
            {p.destacado && (
              <div className="mt-2">
                <Badge variant="destacado" dot />
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-3 pb-4 border-b border-slate-100">
            <span className="text-3xl font-extrabold text-slate-900">Bs. {p.precio}</span>
            <Badge
              variant={p.stock === 0 ? "sin-stock" : p.stock <= 5 ? "stock-bajo" : "stock-ok"}
            />
          </div>

          {p.descripcion && (
            <p className="text-sm text-slate-600 leading-relaxed">{p.descripcion}</p>
          )}

          {p.vendedor.id ? (
            <Link
              href={`/tienda/${p.vendedor.id}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors group"
            >
              <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">Vendido por</p>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">{p.vendedor.nombreNegocio}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
            </Link>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Vendido por</p>
                <p className="text-sm font-semibold text-slate-900">{p.vendedor.nombreNegocio}</p>
              </div>
            </div>
          )}

          {p.etiquetas.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              {p.etiquetas.map((e) => (
                <span key={e.nombre} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full">
                  {e.nombre}
                </span>
              ))}
            </div>
          )}

          {/* Purchase section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="text-sm text-slate-600">
              {p.stock > 0 ? `${p.stock} unidades disponibles` : "Sin stock disponible"}
            </div>

            {user?.rol === "COMPRADOR" && p.stock > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-semibold text-slate-900">{cantidad}</span>
                  <button
                    onClick={() => setCantidad((c) => Math.min(p!.stock, c + 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={adding || added}
                  className={`flex-1 flex items-center justify-center gap-2 text-white font-semibold
                             rounded-xl py-3 text-sm transition-colors shadow-sm ${
                               added
                                 ? "bg-emerald-500 shadow-emerald-200"
                                 : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-indigo-200"
                             }`}
                >
                  {added
                    ? <><CheckCircle className="h-4 w-4" /> ¡Agregado al carrito!</>
                    : adding
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Agregando…</>
                      : <><ShoppingCart className="h-4 w-4" /> Agregar al carrito</>
                  }
                </button>
              </div>
            )}

            {!user && (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600
                           font-semibold rounded-xl py-3 text-sm hover:bg-indigo-50 transition-colors"
              >
                Inicia sesión para comprar
              </Link>
            )}

            {user && (
              <ReportarDialog
                tipo="PRODUCTO"
                referenciaId={p.id}
                trigger={
                  <button
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Flag className="h-3.5 w-3.5" /> Reportar este producto
                  </button>
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <ProductosRecomendados productoId={p.id} />

      {/* Reseñas del vendedor */}
      {p.vendedor.id && (
        <ProductoResenias
          vendedorId={p.vendedor.id}
          ratingPromedio={p.vendedor.ratingPromedio}
          totalResenias={p.vendedor.totalResenias}
        />
      )}
    </div>
  );
}
