import type { MetadataRoute } from "next";
import { gqlFetchCacheable } from "@/lib/graphql-server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Se regenera cada hora (ISR)
export const revalidate = 3600;

const PRODUCTOS_SITEMAP_Q = `
  query SitemapProductos($limite: Int) {
    productos(limite: $limite, soloActivos: true) {
      items { id }
    }
  }`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`,          lastModified: ahora, changeFrequency: "daily",  priority: 1 },
    { url: `${siteUrl}/productos`, lastModified: ahora, changeFrequency: "daily",  priority: 0.9 },
    { url: `${siteUrl}/buscar`,    lastModified: ahora, changeFrequency: "weekly", priority: 0.5 },
  ];

  // Productos (degradación elegante: si el backend falla, solo rutas estáticas)
  try {
    const data = await gqlFetchCacheable<{ productos: { items: { id: string }[] } }>(
      PRODUCTOS_SITEMAP_Q, { limite: 1000 }, 3600,
    );
    const productos: MetadataRoute.Sitemap = data.productos.items.map((p) => ({
      url: `${siteUrl}/productos/${p.id}`,
      lastModified: ahora,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...estaticas, ...productos];
  } catch {
    return estaticas;
  }
}
