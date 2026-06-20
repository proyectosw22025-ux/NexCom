import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // Cloudinary (subida de imágenes de productos)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Generador de QR del checkout simulado
      { protocol: "https", hostname: "api.qrserver.com" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },
};

export default nextConfig;
