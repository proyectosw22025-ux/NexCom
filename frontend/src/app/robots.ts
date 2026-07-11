import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Permite indexar las páginas públicas (catálogo, producto, tienda) y bloquea
// las áreas privadas/transaccionales (paneles y checkout).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/vendedor", "/cliente", "/checkout", "/login", "/registro"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
