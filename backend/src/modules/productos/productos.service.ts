import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { productosRepository } from "./productos.repository.js";
import { etiquetasRepository } from "../etiquetas/etiquetas.repository.js";
import { getConfigNumber } from "../../shared/config.util.js";
import { getFromCache, setCache, deleteCache, invalidatePattern, CacheKeys } from "../../shared/cache.util.js";
import { env } from "../../config/env.js";

type ProductoInput = {
  nombre:      string;
  descripcion?: string | null;
  precio:      string;
  stock:       number;
  categoriaId: string;
  etiquetas?:  string[] | null;
  imagenesUrl?: string[] | null;
};

async function resolveEtiquetaIds(nombres: string[], prisma: PrismaClient): Promise<string[]> {
  const tags = await Promise.all(nombres.map((n) => etiquetasRepository.findOrCreate(n, prisma)));
  return tags.map((t) => t.id);
}

async function invalidarCaches(vendedorId?: string) {
  await invalidatePattern("busqueda:*");
  await invalidatePattern("catalogo:list:*"); // catálogo paginado cacheado
  await deleteCache(CacheKeys.categorias());
  if (vendedorId) await deleteCache(CacheKeys.catalogoVendedor(vendedorId, 1));
}

export const productosService = {
  async getAll(
    { pagina = 1, limite = 20, categoriaId, soloActivos = true }:
      { pagina?: number; limite?: number; categoriaId?: string | null; soloActivos?: boolean | null },
    prisma: PrismaClient,
  ) {
    // Caché de catálogo: lectura pública y de altísima frecuencia, datos que
    // cambian poco. TTL corto (CACHE_TTL_CATALOGO) + invalidación al mutar
    // productos. Convierte el cuello de botella medido (~1-1.8s) en ~piso de red.
    const cacheKey = CacheKeys.catalogo(pagina, limite, categoriaId, soloActivos);
    const cached   = await getFromCache<{ items: unknown[]; total: number; pagina: number; totalPaginas: number }>(cacheKey);
    if (cached) return cached;

    const { total, items } = await productosRepository.findPaginated(
      { pagina, limite, categoriaId, soloActivos },
      prisma,
    );
    const result = {
      items,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    };

    await setCache(cacheKey, result, env.CACHE_TTL_CATALOGO);
    return result;
  },

  async getById(id: string, prisma: PrismaClient) {
    const cacheKey = CacheKeys.producto(id);
    const cached   = await getFromCache(cacheKey);
    if (cached) return cached;

    const p = await productosRepository.findById(id, prisma);
    if (!p) throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });

    await setCache(cacheKey, p, env.CACHE_TTL_PRODUCTO);
    return p;
  },

  async getMisProductos(vendedorId: string, prisma: PrismaClient) {
    return productosRepository.findByVendedor(vendedorId, prisma);
  },

  async crear(input: ProductoInput, vendedorId: string, prisma: PrismaClient) {
    const precio = new Decimal(input.precio);
    if (precio.lte(0)) {
      throw new GraphQLError("El precio debe ser mayor a 0.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (input.stock < 0) {
      throw new GraphQLError("El stock no puede ser negativo.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    // Verificar límite de productos
    const maxProductos = await getConfigNumber("max_productos_vendedor", prisma);
    const total = await prisma.producto.count({ where: { vendedorId, activo: true } });
    if (total >= maxProductos) {
      throw new GraphQLError(`Has alcanzado el límite de ${maxProductos} productos activos.`, {
        extensions: { code: "FORBIDDEN" },
      });
    }

    // Verificar límite de imágenes
    const maxImagenes = await getConfigNumber("max_imagenes_producto", prisma);
    const imgs = (input.imagenesUrl ?? []).slice(0, maxImagenes);

    const etiquetaIds = input.etiquetas?.length
      ? await resolveEtiquetaIds(input.etiquetas, prisma)
      : [];

    const producto = await productosRepository.create(
      { vendedorId, categoriaId: input.categoriaId, nombre: input.nombre,
        descripcion: input.descripcion, precio, stock: input.stock,
        etiquetaIds, imagenesUrl: imgs },
      prisma,
    );

    await invalidarCaches(vendedorId);
    return producto;
  },

  async actualizar(id: string, input: Omit<ProductoInput, "imagenesUrl">, vendedorId: string, prisma: PrismaClient) {
    const existente = await productosRepository.findById(id, prisma);
    if (!existente) throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    if (existente.vendedorId !== vendedorId) {
      throw new GraphQLError("No tienes permiso para editar este producto.", { extensions: { code: "FORBIDDEN" } });
    }

    const precio = input.precio !== undefined ? new Decimal(input.precio) : undefined;
    if (precio && precio.lte(0)) {
      throw new GraphQLError("El precio debe ser mayor a 0.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const etiquetaIds = input.etiquetas != null
      ? (input.etiquetas.length ? await resolveEtiquetaIds(input.etiquetas, prisma) : [])
      : undefined;

    const p = await productosRepository.update(id, {
      nombre: input.nombre, descripcion: input.descripcion, precio,
      stock: input.stock, categoriaId: input.categoriaId, etiquetaIds,
    }, prisma);

    await deleteCache(CacheKeys.producto(id));
    await invalidarCaches(vendedorId);
    return p;
  },

  async eliminar(id: string, vendedorId: string, prisma: PrismaClient) {
    const existente = await productosRepository.findById(id, prisma);
    if (!existente) throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    if (existente.vendedorId !== vendedorId) {
      throw new GraphQLError("No tienes permiso para eliminar este producto.", { extensions: { code: "FORBIDDEN" } });
    }
    await productosRepository.softDelete(id, prisma);
    await deleteCache(CacheKeys.producto(id));
    await invalidarCaches(vendedorId);
    return true;
  },

  async toggleDestacado(id: string, prisma: PrismaClient) {
    const p = await productosRepository.toggleDestacado(id, prisma);
    await deleteCache(CacheKeys.producto(id));
    await invalidatePattern("busqueda:*");
    await invalidatePattern("catalogo:list:*"); // el orden del catálogo depende de `destacado`
    return p;
  },

  async agregarImagenes(productoId: string, urls: string[], vendedorId: string, prisma: PrismaClient) {
    const existente = await productosRepository.findById(productoId, prisma);
    if (!existente) throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    if (existente.vendedorId !== vendedorId) {
      throw new GraphQLError("No tienes permiso para modificar este producto.", { extensions: { code: "FORBIDDEN" } });
    }
    const maxImagenes = await getConfigNumber("max_imagenes_producto", prisma);
    const actuales    = existente.imagenes.length;
    if (actuales >= maxImagenes) {
      throw new GraphQLError(`Has alcanzado el límite de ${maxImagenes} imágenes por producto.`, {
        extensions: { code: "FORBIDDEN" },
      });
    }
    const urlsPermitidas = urls.slice(0, maxImagenes - actuales);
    const p = await productosRepository.addImagenes(productoId, urlsPermitidas, prisma);
    await deleteCache(CacheKeys.producto(productoId));
    return p;
  },

  async eliminarImagen(imagenId: string, prisma: PrismaClient) {
    return productosRepository.removeImagen(imagenId, prisma);
  },
};
