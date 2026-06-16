import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, Package } from "lucide-react";
import { ProductoCard, type ProductoCardData } from "@/components/productos/ProductoCard";
import { gqlFetchCacheable } from "@/lib/graphql-server";

// SSR con regeneración: la página se renderiza en el servidor (HTML con datos,
// sin cascada de cliente) y su respuesta de datos se cachea hasta `revalidate`s.
export const revalidate = 60;

const LIMITE = 12;

interface PaginatedProductos {
  items:        ProductoCardData[];
  total:        number;
  pagina:       number;
  totalPaginas: number;
}
interface Categoria { id: string; nombre: string; slug: string }

const PRODUCTOS_Q = `
  query Productos($pagina: Int, $limite: Int, $categoriaId: ID, $soloActivos: Boolean) {
    productos(pagina: $pagina, limite: $limite, categoriaId: $categoriaId, soloActivos: $soloActivos) {
      items {
        id nombre descripcion precio stock activo destacado
        categoria { id nombre slug }
        vendedor  { nombreNegocio }
        imagenes  { url orden }
        etiquetas { nombre }
      }
      total pagina totalPaginas
    }
  }`;

const CATEGORIAS_Q = `
  query Categorias($soloRaices: Boolean) {
    categorias(soloRaices: $soloRaices) { id nombre slug }
  }`;

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const categoriaId = sp.categoria ?? null;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1", 10) || 1);

  let result: PaginatedProductos | null = null;
  let categorias: Categoria[] = [];

  // Degradación elegante: si el backend falla, mostramos estado vacío en vez de
  // romper la página (cumple "sin fallas de funcionalidad").
  try {
    const [prodData, catData] = await Promise.all([
      gqlFetchCacheable<{ productos: PaginatedProductos }>(
        PRODUCTOS_Q, { pagina, limite: LIMITE, categoriaId, soloActivos: true }, 60,
      ),
      gqlFetchCacheable<{ categorias: Categoria[] }>(
        CATEGORIAS_Q, { soloRaices: false }, 300,
      ),
    ]);
    result     = prodData.productos;
    categorias = catData.categorias;
  } catch {
    /* fetch falló — se renderiza el estado vacío */
  }

  const hrefCategoria = (catId: string | null) => {
    const p = new URLSearchParams();
    if (catId) p.set("categoria", catId);
    const qs = p.toString();
    return qs ? `/productos?${qs}` : "/productos";
  };
  const hrefPagina = (n: number) => {
    const p = new URLSearchParams();
    if (categoriaId) p.set("categoria", categoriaId);
    if (n > 1) p.set("pagina", String(n));
    const qs = p.toString();
    return qs ? `/productos?${qs}` : "/productos";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Sidebar filtros */}
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Categorías</h2>
            </div>
            <Link
              href={hrefCategoria(null)}
              scroll={false}
              className={`block w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-1 ${
                !categoriaId ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Todos
            </Link>
            {categorias.map((cat) => (
              <Link
                key={cat.id}
                href={hrefCategoria(cat.id)}
                scroll={false}
                className={`block w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${
                  categoriaId === cat.id
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.nombre}
              </Link>
            ))}
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Catálogo</h1>
              {result && (
                <p className="text-sm text-slate-400 mt-0.5">{result.total} productos</p>
              )}
            </div>
          </div>

          {!result || result.items.length === 0 ? (
            <div className="text-center py-24">
              <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="font-semibold text-slate-700">Sin productos disponibles</p>
              <p className="text-sm text-slate-400 mt-1">Intenta con otra categoría o vuelve pronto</p>
              <Link
                href="/buscar"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                           hover:text-indigo-700 transition-colors"
              >
                Buscar un producto específico →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {result.items.map((p, index) => <ProductoCard key={p.id} producto={p} index={index} />)}
              </div>

              {/* Pagination */}
              {result.totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  {pagina > 1 ? (
                    <Link
                      href={hrefPagina(pagina - 1)}
                      scroll={false}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="p-2 rounded-xl border border-slate-200 opacity-40 cursor-not-allowed">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}

                  <span className="text-sm text-slate-600 px-4">
                    Página {pagina} de {result.totalPaginas}
                  </span>

                  {pagina < result.totalPaginas ? (
                    <Link
                      href={hrefPagina(pagina + 1)}
                      scroll={false}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                      aria-label="Página siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="p-2 rounded-xl border border-slate-200 opacity-40 cursor-not-allowed">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
