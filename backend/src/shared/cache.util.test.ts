import { describe, it, expect, vi, beforeEach } from "vitest";

const { redisGet, redisSetex, redisSet, redisDel } = vi.hoisted(() => ({
  redisGet:   vi.fn(),
  redisSetex: vi.fn(),
  redisSet:   vi.fn(),
  redisDel:   vi.fn(),
}));
vi.mock("./redis.client.js", () => ({
  default: { get: redisGet, setex: redisSetex, set: redisSet, del: redisDel },
}));

import { getOrSetCache } from "./cache.util.js";

describe("getOrSetCache (anti-stampede)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el valor cacheado sin llamar al producer (cache hit)", async () => {
    redisGet.mockResolvedValue(JSON.stringify({ items: [1, 2] }));
    const producer = vi.fn();

    const result = await getOrSetCache("catalogo:x", 180, producer);

    expect(result).toEqual({ items: [1, 2] });
    expect(producer).not.toHaveBeenCalled();
  });

  it("en cache miss con lock: produce, cachea y libera el lock", async () => {
    redisGet.mockResolvedValue(null);   // miss
    redisSet.mockResolvedValue("OK");   // lock adquirido
    redisDel.mockResolvedValue(1);
    const producer = vi.fn().mockResolvedValue({ items: [9] });

    const result = await getOrSetCache("catalogo:y", 180, producer);

    expect(result).toEqual({ items: [9] });
    expect(producer).toHaveBeenCalledOnce();
    expect(redisSetex).toHaveBeenCalledWith("catalogo:y", 180, JSON.stringify({ items: [9] }));
    expect(redisDel).toHaveBeenCalledWith("lock:cache:catalogo:y"); // lock liberado
  });

  it("si otro proceso tiene el lock, espera y sirve el valor que el otro pobló (sin producir)", async () => {
    // 1ª lectura: miss · 2ª lectura (tras esperar): ya poblado por el otro proceso
    redisGet
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ items: ["del-otro"] }));
    redisSet.mockResolvedValue(null); // lock NO adquirido
    const producer = vi.fn();

    const result = await getOrSetCache("catalogo:z", 180, producer);

    expect(result).toEqual({ items: ["del-otro"] });
    expect(producer).not.toHaveBeenCalled(); // no se duplicó el trabajo
  });
});
