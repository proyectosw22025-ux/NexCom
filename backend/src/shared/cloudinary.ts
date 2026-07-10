import crypto from "crypto";
import { GraphQLError } from "graphql";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

export const CLOUDINARY_FOLDER = "nexcom/productos";
export const CLOUDINARY_KYC_FOLDER = "nexcom/kyc";

export function cloudinaryConfigurado(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

// Config del SDK (idempotente): se usa para firmar la subida privada del KYC y
// para generar URLs de entrega firmadas de assets `authenticated`.
if (cloudinaryConfigurado()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME!,
    api_key:    env.CLOUDINARY_API_KEY!,
    api_secret: env.CLOUDINARY_API_SECRET!,
    secure:     true,
  });
}

export interface SubidaFirmada {
  cloudName: string;
  apiKey:    string;
  timestamp: number;
  folder:    string;
  signature: string;
  tipo?:     string; // "authenticated" para el KYC (privado)
}

/**
 * Firma para subir UN archivo directo del navegador a Cloudinary, sin exponer
 * el API_SECRET. Cloudinary firma: SHA-1 de los params ordenados alfabéticamente
 * (`k=v&k=v`) + api_secret. (Imágenes públicas de producto.)
 */
export function firmarSubida(): SubidaFirmada {
  if (!cloudinaryConfigurado()) {
    throw new GraphQLError("La subida de imágenes no está configurada.", {
      extensions: { code: "SERVICE_UNAVAILABLE" },
    });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = CLOUDINARY_FOLDER;
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}` + env.CLOUDINARY_API_SECRET)
    .digest("hex");
  return { cloudName: env.CLOUDINARY_CLOUD_NAME!, apiKey: env.CLOUDINARY_API_KEY!, timestamp, folder, signature };
}

/**
 * Firma para subir el DOCUMENTO KYC como `type: authenticated` (privado). El
 * asset queda inaccesible por URL directa: solo se ve con una URL firmada que
 * el backend genera para el dueño o el admin. `type` va dentro de la firma.
 */
export function firmarSubidaKyc(): SubidaFirmada {
  if (!cloudinaryConfigurado()) {
    throw new GraphQLError("La subida de documentos no está configurada.", {
      extensions: { code: "SERVICE_UNAVAILABLE" },
    });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = CLOUDINARY_KYC_FOLDER;
  const tipo      = "authenticated";
  // El SDK firma correctamente el set de params (incluye `type`).
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp, type: tipo },
    env.CLOUDINARY_API_SECRET!,
  );
  return { cloudName: env.CLOUDINARY_CLOUD_NAME!, apiKey: env.CLOUDINARY_API_KEY!, timestamp, folder, signature, tipo };
}

/**
 * URL de entrega FIRMADA y efímera (5 min) de un documento KYC `authenticated`.
 * Solo el backend puede generarla; sin firma válida el documento no se ve.
 * Recibe el `public_id` que devolvió Cloudinary al subir.
 */
export function urlFirmadaKyc(publicId: string | null | undefined): string | null {
  if (!publicId || !cloudinaryConfigurado()) return null;
  return cloudinary.url(publicId, {
    type:        "authenticated",
    resource_type: "image",
    sign_url:    true,
    secure:      true,
    expires_at:  Math.floor(Date.now() / 1000) + 5 * 60,
  });
}
