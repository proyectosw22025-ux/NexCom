import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { gqlFetchCacheable } from "@/lib/graphql-server";
import type { ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoCompra } from "@/components/productos/ProductoCompra";
import { ProductoResenias } from "@/components/productos/ProductoResenias";
import { ProductosRecomendados } from "@/components/productos/ProductosRecomendados";
import { ProductoPreguntas } from "@/components/productos/ProductoPreguntas";

export const revalidate = 120;

const PRODUCTO_Q = `
  query Producto($id: ID!) {
    producto(id: $id) {
      id nombre descripcion precio stock activo destacado
      categoria { id nombre slug }
      vendedor  { id nombreNegocio ratingPromedio totalResenias }
      imagenes  { url orden }
      etiquetas { nombre }
    }
  }`;

async function fetchProducto(id: string): Promise<ProductoCardData | null> {
  try {
    const data = await gqlFetchCacheable<{ producto: ProductoCardData | null }>(PRODUCTO_Q, { id }, 120);
    return data.producto;
  } catch {
    return null;
  }
}

// G.2 — SEO por producto: título y descripción dinámicos + Open Graph (la imagen
// usa metadataBase del layout; con dominio real las URLs serán absolutas).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchProducto(id);
  if (!p) return { title: "Producto no encontrado" };

  const descripcion = p.descripcion?.slice(0, 160) ?? `${p.nombre} en NexCom — marketplace local boliviano.`;
  const imagen = [...p.imagenes].sort((a, b) => a.orden - b.orden)[0]?.url;

  return {
    title: p.nombre,
    description: descripcion,
    openGraph: {
      title: p.nombre,
      description: descripcion,
      type: "website",
      ...(imagen ? { images: [{ url: imagen }] } : {}),
    },
  };
}

export default async function ProductoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProducto(id);
  if (!p) notFound();

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

      {/* Galería + compra (cliente) */}
      <ProductoCompra producto={p} />

      {/* Preguntas y respuestas */}
      <ProductoPreguntas productoId={p.id} vendedorId={p.vendedor.id} />

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
