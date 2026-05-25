import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { categoriasRepository } from "./categorias.repository.js";
import { getFromCache, setCache, deleteCache, CacheKeys } from "../../shared/cache.util.js";

export const categoriasService = {
  async getAll(soloRaices: boolean, prisma: PrismaClient) {
    const key    = CacheKeys.categorias();
    const cached = await getFromCache(key);
    if (cached) return cached;
    const cats = await categoriasRepository.findAll(soloRaices, prisma);
    await setCache(key, cats, 3600);
    return cats;
  },

  getBySlug(slug: string, prisma: PrismaClient) {
    return categoriasRepository.findBySlug(slug, prisma);
  },

  async create(
    input: { nombre: string; slug: string; icono?: string | null; padreId?: string | null; orden?: number },
    prisma: PrismaClient,
  ) {
    const existing = await categoriasRepository.findBySlug(input.slug, prisma);
    if (existing) {
      throw new GraphQLError(`El slug "${input.slug}" ya está en uso.`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    const cat = await categoriasRepository.create(input, prisma);
    await deleteCache(CacheKeys.categorias());
    return cat;
  },

  async update(
    id: string,
    input: { nombre?: string; slug?: string; icono?: string | null; padreId?: string | null; orden?: number },
    prisma: PrismaClient,
  ) {
    const cat = await categoriasRepository.update(id, input, prisma);
    await deleteCache(CacheKeys.categorias());
    return cat;
  },
};
