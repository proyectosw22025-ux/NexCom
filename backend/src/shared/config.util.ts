import type { PrismaClient } from "@prisma/client";
import { getFromCache, setCache } from "./cache.util.js";

const DEFAULTS: Record<string, string> = {
  comision_porcentaje:       "0",
  max_imagenes_producto:     "5",
  max_productos_vendedor:    "100",
  cupones_habilitados:       "true",
  dias_auto_completar_orden: "2",
  ttl_carrito_horas:         "72",
};

export async function getConfig(
  clave: string,
  prisma: PrismaClient,
): Promise<string> {
  const cacheKey = `config:${clave}`;
  const cached = await getFromCache<string>(cacheKey);
  if (cached !== null) return cached;

  const row = await prisma.configuracionSistema.findUnique({ where: { clave } });
  const valor = row?.valor ?? DEFAULTS[clave] ?? "";
  await setCache(cacheKey, valor, 3600);
  return valor;
}

export async function getConfigNumber(clave: string, prisma: PrismaClient): Promise<number> {
  return Number(await getConfig(clave, prisma));
}
