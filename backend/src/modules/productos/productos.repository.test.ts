import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { productosRepository } from "./productos.repository.js";

// Prisma mockeado: capturamos los args de findMany para validar el SQL generado
const findMany = vi.fn();
const count    = vi.fn();
const prisma = {
  producto: { findMany, count },
  // $transaction([...]) ejecuta el arreglo de promesas (como Prisma real)
  $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
} as unknown as PrismaClient;

function lastFindManyArgs() {
  return findMany.mock.calls.at(-1)?.[0] as { where: Record<string, unknown>; orderBy: unknown };
}

describe("productosRepository.findPaginated — filtros y orden (SQL)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]); // sin filas; solo validamos los args
  });

  it("orden por defecto (RECIENTES): destacados primero, luego recientes", async () => {
    await productosRepository.findPaginated({ pagina: 1, limite: 12, orden: "RECIENTES" }, prisma);
    expect(lastFindManyArgs().orderBy).toEqual([{ destacado: "desc" }, { creadoEn: "desc" }]);
  });

  it("PRECIO_ASC ordena por precio ascendente", async () => {
    await productosRepository.findPaginated({ pagina: 1, limite: 12, orden: "PRECIO_ASC" }, prisma);
    expect(lastFindManyArgs().orderBy).toEqual([{ precio: "asc" }]);
  });

  it("PRECIO_DESC ordena por precio descendente", async () => {
    await productosRepository.findPaginated({ pagina: 1, limite: 12, orden: "PRECIO_DESC" }, prisma);
    expect(lastFindManyArgs().orderBy).toEqual([{ precio: "desc" }]);
  });

  it("MEJOR_VALORADOS ordena por rating del vendedor (relación, sin N+1)", async () => {
    await productosRepository.findPaginated({ pagina: 1, limite: 12, orden: "MEJOR_VALORADOS" }, prisma);
    expect(lastFindManyArgs().orderBy).toEqual([
      { vendedor: { ratingPromedio: "desc" } },
      { creadoEn: "desc" },
    ]);
  });

  it("aplica el rango de precio como filtro SQL (gte/lte)", async () => {
    await productosRepository.findPaginated(
      { pagina: 1, limite: 12, precioMin: 50, precioMax: 200 }, prisma,
    );
    expect(lastFindManyArgs().where).toMatchObject({
      activo: true,
      precio: { gte: 50, lte: 200 },
    });
  });

  it("filtra solo por precioMin cuando no hay máximo", async () => {
    await productosRepository.findPaginated({ pagina: 1, limite: 12, precioMin: 100 }, prisma);
    expect(lastFindManyArgs().where.precio).toEqual({ gte: 100 });
  });

  it("incluye categoriaId en el where cuando se provee", async () => {
    await productosRepository.findPaginated(
      { pagina: 1, limite: 12, categoriaId: "cat-1" }, prisma,
    );
    expect(lastFindManyArgs().where).toMatchObject({ activo: true, categoriaId: "cat-1" });
  });

  it("paginación: calcula skip/take correctamente", async () => {
    await productosRepository.findPaginated({ pagina: 3, limite: 12 }, prisma);
    const args = findMany.mock.calls.at(-1)?.[0] as { skip: number; take: number };
    expect(args).toMatchObject({ skip: 24, take: 12 });
  });
});

describe("productosRepository.findByIds — preserva orden de relevancia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    count.mockResolvedValue(0);
  });

  it("devuelve los productos en el mismo orden que los ids solicitados", async () => {
    // findMany puede devolver en cualquier orden; el repo debe reordenar
    findMany.mockResolvedValue([
      { id: "c", etiquetas: [] },
      { id: "a", etiquetas: [] },
      { id: "b", etiquetas: [] },
    ]);

    const result = await productosRepository.findByIds(["a", "b", "c"], prisma);
    expect(result.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("ignora ids inexistentes sin romper el orden", async () => {
    findMany.mockResolvedValue([{ id: "a", etiquetas: [] }]);
    const result = await productosRepository.findByIds(["a", "zzz"], prisma);
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });

  it("no consulta la base si la lista de ids está vacía", async () => {
    const result = await productosRepository.findByIds([], prisma);
    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
