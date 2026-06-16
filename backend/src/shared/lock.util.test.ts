import { describe, it, expect, vi, beforeEach } from "vitest";

const { redisSet, redisDel } = vi.hoisted(() => ({
  redisSet: vi.fn(),
  redisDel: vi.fn(),
}));
vi.mock("./redis.client.js", () => ({
  default: { set: redisSet, del: redisDel },
}));

import { acquireLock, releaseLock, runWithLock } from "./lock.util.js";

describe("lock.util", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acquireLock usa SET NX EX y devuelve true cuando obtiene el lock", async () => {
    redisSet.mockResolvedValue("OK");
    const got = await acquireLock("mi-lock", 30);
    expect(got).toBe(true);
    expect(redisSet).toHaveBeenCalledWith("mi-lock", "1", "EX", 30, "NX");
  });

  it("acquireLock devuelve false cuando el lock ya está tomado", async () => {
    redisSet.mockResolvedValue(null); // NX falla → otra instancia lo tiene
    expect(await acquireLock("mi-lock", 30)).toBe(false);
  });

  it("acquireLock falla en abierto (false) si Redis lanza", async () => {
    redisSet.mockRejectedValue(new Error("redis down"));
    expect(await acquireLock("mi-lock", 30)).toBe(false);
  });

  it("runWithLock ejecuta fn y libera el lock cuando lo obtiene", async () => {
    redisSet.mockResolvedValue("OK");
    redisDel.mockResolvedValue(1);
    const fn = vi.fn().mockResolvedValue(undefined);

    const ran = await runWithLock("job", 60, fn);

    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
    expect(redisDel).toHaveBeenCalledWith("job"); // se liberó
  });

  it("runWithLock NO ejecuta fn si otra instancia tiene el lock", async () => {
    redisSet.mockResolvedValue(null);
    const fn = vi.fn();

    const ran = await runWithLock("job", 60, fn);

    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(redisDel).not.toHaveBeenCalled();
  });

  it("runWithLock libera el lock aunque fn lance", async () => {
    redisSet.mockResolvedValue("OK");
    redisDel.mockResolvedValue(1);
    const fn = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(runWithLock("job", 60, fn)).rejects.toThrow("boom");
    expect(redisDel).toHaveBeenCalledWith("job");
  });

  it("releaseLock no lanza si Redis falla", async () => {
    redisDel.mockRejectedValue(new Error("redis down"));
    await expect(releaseLock("x")).resolves.toBeUndefined();
  });
});
