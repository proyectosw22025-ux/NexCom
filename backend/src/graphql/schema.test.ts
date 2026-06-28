import { describe, it, expect } from "vitest";

/**
 * Guarda de regresión: el merge de typeDefs ocurre en RUNTIME (mergeTypeDefs), no
 * en tiempo de compilación, así que un campo de Mutation/Query duplicado con tipos
 * distintos NO lo detecta `tsc` — solo revienta al arrancar el server. Importar el
 * schema aquí ejecuta el merge; si hay conflicto (p. ej. dos `verificarVendedor`),
 * este test falla en CI/local en vez de en producción.
 */
describe("GraphQL schema", () => {
  it("fusiona los typeDefs de todos los módulos sin conflictos de tipo", async () => {
    const mod = await import("./schema.js");
    expect(mod.schema).toBeDefined();
  });
});
