import crypto from "crypto";
import { GraphQLError } from "graphql";
import { env } from "../config/env.js";

export const CLOUDINARY_FOLDER = "nexcom/productos";

export function cloudinaryConfigurado(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export interface SubidaFirmada {
  cloudName: string;
  apiKey:    string;
  timestamp: number;
  folder:    string;
  signature: string;
}

/**
 * Genera una firma para subir UN archivo directo del navegador a Cloudinary, sin
 * exponer el API_SECRET. Cloudinary firma: SHA-1 de los params ordenados
 * alfabéticamente (`k=v&k=v`) + api_secret.
 */
export function firmarSubida(): SubidaFirmada {
  if (!cloudinaryConfigurado()) {
    throw new GraphQLError("La subida de imágenes no está configurada.", {
      extensions: { code: "SERVICE_UNAVAILABLE" },
    });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = CLOUDINARY_FOLDER;

  // Solo los params que también se envían a Cloudinary (orden alfabético: folder, timestamp)
  const aFirmar   = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(aFirmar + env.CLOUDINARY_API_SECRET)
    .digest("hex");

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey:    env.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    signature,
  };
}
