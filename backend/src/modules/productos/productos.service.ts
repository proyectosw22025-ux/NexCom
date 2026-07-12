import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { productosRepository } from "./productos.repository.js";
import { etiquetasRepository } from "../etiquetas/etiquetas.repository.js";
import { favoritosRepository } from "../favoritos/favoritos.repository.js";
import { publishNotificacion } from "../../shared/pubsub.js";
import { getConfigNumber } from "../../shared/config.util.js";
import { getFromCache, setCache, deleteCache, invalidatePattern, getOrSetCache, CacheKeys } from "../../shared/cache.util.js";
import { env } from "../../config/env.js";

// Planes de vendedor (H.2/H.3)
const PRO_MAX_PRODUCTOS = 500;  // límite de productos para el plan PRO
const PRO_MAX_DESTACADOS = 3;   // productos que un vendedor PRO puede destacar

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

/**
 * Notifica a quienes tienen el producto en favoritos que bajó de precio.
 * Persiste + publica en tiempo real (infra de notificaciones existente).
 * Best-effort: un fallo aquí no debe romper la actualización del producto.
 */
async function notificarBajadaPrecio(
  productoId: string, nombre: string, precioAnterior: string, precioNuevo: string, prisma: PrismaClient,
) {
  const usuarioIds = await favoritosRepository.findUsuariosQueFavoritearon(productoId, prisma);
  for (const usuarioId of usuarioIds) {
    const notif = await prisma.notificacion.create({
      data: {
        usuarioId,
        tipo:    "BAJADA_PRECIO",
        titulo:  "¡Bajó un producto que te gusta!",
        mensaje: `${nombre} ahora cuesta Bs. ${precioNuevo} (antes Bs. ${precioAnterior}).`,
        url:     `/productos/${productoId}`,
      },
    });
    publishNotificacion(usuarioId, {
      id:       notif.id,
      tipo:     notif.tipo,
      titulo:   notif.titulo,
      mensaje:  notif.mensaje,
      leido:    notif.leido,
      url:      notif.url,
      ordenId:  notif.ordenId,
      creadoEn: notif.creadoEn.toISOString(),
    });
  }
}

async function invalidarCaches(vendedorId?: string) {
  await invalidatePattern("busqueda:*");
  await invalidatePattern("catalogo:list:*"); // catálogo paginado cacheado
  await deleteCache(CacheKeys.categorias());
  if (vendedorId) await deleteCache(CacheKeys.catalogoVendedor(vendedorId, 1));
}

export const productosService = {
  async getAll(
    { pagina = 1, limite = 20, categoriaId, vendedorId, soloActivos = true, orden, precioMin, precioMax, ciudad }:
      {
        pagina?: number; limite?: number; categoriaId?: string | null; vendedorId?: string | null; soloActivos?: boolean | null;
        orden?: string | null; precioMin?: number | null; precioMax?: number | null; ciudad?: string | null;
      },
    prisma: PrismaClient,
  ) {
    // Saneamiento de filtros (defensa contra valores inválidos)
    const ordenValido = ["RECIENTES", "PRECIO_ASC", "PRECIO_DESC", "MEJOR_VALORADOS", "MAS_VENDIDOS"].includes(orden ?? "")
      ? (orden as string) : "RECIENTES";
    const min = typeof precioMin === "number" && precioMin >= 0 ? precioMin : null;
    const max = typeof precioMax === "number" && precioMax >= 0 ? precioMax : null;
    const ciudadFiltro = ciudad?.trim() || null;

    // Caché de catálogo: lectura pública y de altísima frecuencia, datos que
    // cambian poco. TTL corto (CACHE_TTL_CATALOGO) + invalidación al mutar
    // productos. Convierte el cuello de botella medido (~1-1.8s) en ~piso de red.
    const cacheKey = CacheKeys.catalogo(pagina, limite, categoriaId, soloActivos, ordenValido, min, max, vendedorId, ciudadFiltro);
    return getOrSetCache(cacheKey, env.CACHE_TTL_CATALOGO, async () => {
      const { total, items } = await productosRepository.findPaginated(
        { pagina, limite, categoriaId, vendedorId, soloActivos, orden: ordenValido, precioMin: min, precioMax: max, ciudad: ciudadFiltro },
        prisma,
      );
      return {
        items,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite),
      };
    });
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

  /**
   * Recomendaciones "También te puede interesar".
   * Estrategia: co-ocurrencia en órdenes (productos comprados junto al actual),
   * calculada en SQL. Si no hay suficientes datos, completa con productos
   * activos de la misma categoría. Cacheado en Redis.
   */
  async getRecomendados(productoId: string, limite: number, prisma: PrismaClient) {
    const max = Math.min(Math.max(limite, 1), 12);
    return getOrSetCache(`recomendados:${productoId}:${max}`, env.CACHE_TTL_PRODUCTO, async () => {
      const filas = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT io2.producto_id AS id, COUNT(*)::int AS freq
        FROM items_orden io1
        JOIN items_orden io2
          ON io1.orden_id = io2.orden_id AND io2.producto_id <> io1.producto_id
        JOIN productos p ON p.id = io2.producto_id AND p.activo = true
        WHERE io1.producto_id = ${productoId}
        GROUP BY io2.producto_id
        ORDER BY freq DESC
        LIMIT ${max}
      `;
      let ids = filas.map((f) => f.id);

      // Fallback: completar con productos de la misma categoría
      if (ids.length < max) {
        const base = await prisma.producto.findUnique({
          where: { id: productoId }, select: { categoriaId: true },
        });
        if (base) {
          const relleno = await prisma.producto.findMany({
            where:   { categoriaId: base.categoriaId, activo: true, id: { notIn: [productoId, ...ids] } },
            orderBy: [{ destacado: "desc" }, { creadoEn: "desc" }],
            take:    max - ids.length,
            select:  { id: true },
          });
          ids = [...ids, ...relleno.map((r) => r.id)];
        }
      }

      return productosRepository.findByIds(ids, prisma);
    });
  },

  async crear(input: ProductoInput, vendedorId: string, prisma: PrismaClient) {
    const precio = new Decimal(input.precio);
    if (precio.lte(0)) {
      throw new GraphQLError("El precio debe ser mayor a 0.", { extensions: { code: "BAD_USER_INPUT" } });
    }
    if (input.stock < 0) {
      throw new GraphQLError("El stock no puede ser negativo.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    // Verificar límite de productos según el plan del vendedor (H.2)
    const perfil = await prisma.perfilVendedor.findUnique({ where: { id: vendedorId }, select: { plan: true } });
    const maxFree = await getConfigNumber("max_productos_vendedor", prisma);
    const maxProductos = perfil?.plan === "PRO" ? PRO_MAX_PRODUCTOS : maxFree;
    const total = await prisma.producto.count({ where: { vendedorId, activo: true } });
    if (total >= maxProductos) {
      const sugerencia = perfil?.plan === "PRO" ? "" : " Mejora al plan PRO para publicar más.";
      throw new GraphQLError(`Has alcanzado el límite de ${maxProductos} productos activos.${sugerencia}`, {
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
    if (input.stock !== undefined && input.stock < 0) {
      throw new GraphQLError("El stock no puede ser negativo.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const etiquetaIds = input.etiquetas != null
      ? (input.etiquetas.length ? await resolveEtiquetaIds(input.etiquetas, prisma) : [])
      : undefined;

    const precioAnterior = new Decimal(existente.precio.toString());

    const p = await productosRepository.update(id, {
      nombre: input.nombre, descripcion: input.descripcion, precio,
      stock: input.stock, categoriaId: input.categoriaId, etiquetaIds,
    }, prisma);

    await deleteCache(CacheKeys.producto(id));
    await invalidarCaches(vendedorId);

    // D.5 — Alerta de bajada de precio a quienes lo tienen en favoritos
    if (precio && precio.lt(precioAnterior)) {
      await notificarBajadaPrecio(id, p.nombre, precio.toString(), precioAnterior.toString(), prisma)
        .catch((err) => console.error("[BajadaPrecio] no se pudo notificar:", err?.message));
    }

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

  /**
   * H.3 — Destacar/quitar destaque de un producto propio. Beneficio del plan PRO,
   * con tope de productos destacados. Un FREE no puede destacar.
   */
  async destacarMiProducto(id: string, vendedorId: string, prisma: PrismaClient) {
    const existente = await productosRepository.findById(id, prisma);
    if (!existente) throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    if (existente.vendedorId !== vendedorId) {
      throw new GraphQLError("No tienes permiso sobre este producto.", { extensions: { code: "FORBIDDEN" } });
    }

    const perfil = await prisma.perfilVendedor.findUnique({ where: { id: vendedorId }, select: { plan: true } });
    if (perfil?.plan !== "PRO") {
      throw new GraphQLError("Destacar productos es un beneficio del plan PRO. Mejora tu plan para usarlo.", {
        extensions: { code: "FORBIDDEN" },
      });
    }

    // Al activar (no estaba destacado), respetar el tope de destacados
    if (!existente.destacado) {
      const destacados = await prisma.producto.count({ where: { vendedorId, destacado: true, activo: true } });
      if (destacados >= PRO_MAX_DESTACADOS) {
        throw new GraphQLError(`Solo puedes tener ${PRO_MAX_DESTACADOS} productos destacados a la vez.`, {
          extensions: { code: "FORBIDDEN" },
        });
      }
    }

    const p = await productosRepository.toggleDestacado(id, prisma);
    await deleteCache(CacheKeys.producto(id));
    await invalidatePattern("busqueda:*");
    await invalidatePattern("catalogo:list:*");
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
