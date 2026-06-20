import Link from "next/link";
import Image from "next/image";
import { Store, MapPin, Star, Package, ChevronLeft, ChevronRight, ShoppingBag, Crown } from "lucide-react";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { ProductoResenias } from "@/components/productos/ProductoResenias";
import { BotonWhatsApp } from "@/components/common/BotonWhatsApp";
import { SellosConfianza } from "@/components/vendedor/SellosConfianza";
import { gqlFetchCacheable } from "@/lib/graphql-server";

export const revalidate = 60;

const LIMITE = 12;

interface VendedorPublico {
  id: string; nombreNegocio: string; descripcion: string | null; ciudad: string;
  logoUrl: string | null; ratingPromedio: string; totalVentas: number; totalResenias: number; plan: string;
  telefono: string | null; verificado: boolean; respondeRapido: boolean;
}
interface PaginatedProductos {
  items: ProductoCardData[]; total: number; pagina: number; totalPaginas: number;
}

const VENDEDOR_Q = `
  query Vendedor($id: ID!) {
    vendedorPublico(id: $id) {
      id nombreNegocio descripcion ciudad logoUrl ratingPromedio totalVentas totalResenias plan telefono
      verificado respondeRapido
    }
  }`;

const PRODUCTOS_VENDEDOR_Q = `
  query ProductosVendedor($vendedorId: ID, $pagina: Int, $limite: Int) {
    productos(vendedorId: $vendedorId, pagina: $pagina, limite: $limite, soloActivos: true) {
      items {
        id nombre descripcion precio stock activo destacado
        categoria { id nombre slug }
        vendedor  { id nombreNegocio ratingPromedio totalResenias }
        imagenes  { url orden }
        etiquetas { nombre }
      }
      total pagina totalPaginas
    }
  }`;

export default async function TiendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1);

  let vendedor: VendedorPublico | null = null;
  let result: PaginatedProductos | null = null;
  try {
    const [vData, pData] = await Promise.all([
      gqlFetchCacheable<{ vendedorPublico: VendedorPublico | null }>(VENDEDOR_Q, { id }, 120),
      gqlFetchCacheable<{ productos: PaginatedProductos }>(
        PRODUCTOS_VENDEDOR_Q, { vendedorId: id, pagina, limite: LIMITE }, 60,
      ),
    ]);
    vendedor = vData.vendedorPublico;
    result   = pData.productos;
  } catch {
    /* degradación elegante */
  }

  if (!vendedor) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Store className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
        <Link href="/productos" className="text-indigo-600 hover:underline text-sm">← Volver al catálogo</Link>
      </div>
    );
  }

  const rating = parseFloat(vendedor.ratingPromedio);
  const hrefPagina = (n: number) => (n > 1 ? `/tienda/${id}?pagina=${n}` : `/tienda/${id}`);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabecera de la tienda */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
            {vendedor.logoUrl
              ? <Image src={vendedor.logoUrl} alt={vendedor.nombreNegocio} width={64} height={64} className="object-cover w-full h-full" />
              : <Store className="h-7 w-7 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{vendedor.nombreNegocio}</h1>
              {vendedor.plan === "PRO" && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <Crown className="h-3 w-3" /> PRO
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {vendedor.ciudad}</span>
              {vendedor.totalResenias > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
                  <span className="text-slate-400">({vendedor.totalResenias})</span>
                </span>
              )}
              <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {vendedor.totalVentas} ventas</span>
            </div>
            <div className="mt-3">
              <SellosConfianza
                verificado={vendedor.verificado}
                ciudad={vendedor.ciudad}
                ratingPromedio={vendedor.ratingPromedio}
                totalResenias={vendedor.totalResenias}
                respondeRapido={vendedor.respondeRapido}
              />
            </div>
            {vendedor.descripcion && (
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{vendedor.descripcion}</p>
            )}
            <div className="mt-4 inline-flex">
              <BotonWhatsApp
                telefono={vendedor.telefono}
                mensaje={`Hola, vi tu tienda "${vendedor.nombreNegocio}" en NexCom y quisiera más información.`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Productos de la tienda */}
      <div className="flex items-center gap-2 mb-5">
        <Package className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">
          Productos {result && <span className="text-slate-400 font-normal">({result.total})</span>}
        </h2>
      </div>

      {!result || result.items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Esta tienda aún no tiene productos publicados</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {result.items.map((p, i) => <ProductoCard key={p.id} producto={p} index={i} />)}
          </div>

          {result.totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {pagina > 1 ? (
                <Link href={hrefPagina(pagina - 1)} scroll={false} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors" aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              ) : (
                <span className="p-2 rounded-xl border border-slate-200 opacity-40"><ChevronLeft className="h-4 w-4" /></span>
              )}
              <span className="text-sm text-slate-600 px-4">Página {pagina} de {result.totalPaginas}</span>
              {pagina < result.totalPaginas ? (
                <Link href={hrefPagina(pagina + 1)} scroll={false} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors" aria-label="Página siguiente">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="p-2 rounded-xl border border-slate-200 opacity-40"><ChevronRight className="h-4 w-4" /></span>
              )}
            </div>
          )}
        </>
      )}

      {/* Reseñas del vendedor */}
      <ProductoResenias
        vendedorId={vendedor.id}
        ratingPromedio={vendedor.ratingPromedio}
        totalResenias={vendedor.totalResenias}
      />
    </div>
  );
}
