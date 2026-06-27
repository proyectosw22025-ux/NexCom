/**
 * Imágenes temáticas de marketplace (Unsplash CDN, verificadas).
 * Dan "vida" a hero y categorías sin depender de assets propios.
 * Inspiración de tema: MercadoLibre/Amazon (catálogo visual por categoría).
 */
const U = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const HERO_IMG = U("1607082348824-0a96f2a4b9da", 1200); // compras / paquetes
export const HERO_IMG_ALT = U("1556742049-0cfed4f6a45d", 1200); // tienda

/** Imagen por slug de categoría (raíz). Fallback a una genérica de compras. */
const POR_SLUG: Record<string, string> = {
  electronica:     U("1498049794561-7780e7231661"),
  "ropa-moda":     U("1445205170230-053b83016050"),
  alimentos:       U("1542838132-92c53300491e"),
  hogar:           U("1556228453-efd6c1ff04f6"),
  "salud-belleza": U("1596462502278-27bfdc403348"),
};
const GENERICA = U("1441986300917-64674bd600d8");

export function imagenCategoria(slug: string): string {
  return POR_SLUG[slug] ?? GENERICA;
}

/** Tarjetas de categoría destacadas para el catálogo / landing. */
export const CATEGORIAS_DESTACADAS = [
  { slug: "electronica",   nombre: "Electrónica",     emoji: "💻" },
  { slug: "ropa-moda",     nombre: "Ropa y Moda",     emoji: "👗" },
  { slug: "alimentos",     nombre: "Alimentos",       emoji: "🍎" },
  { slug: "hogar",         nombre: "Hogar",           emoji: "🏠" },
  { slug: "salud-belleza", nombre: "Salud y Belleza", emoji: "💄" },
];
