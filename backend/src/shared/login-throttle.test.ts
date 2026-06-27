import { describe, it, expect, vi, beforeEach } from "vitest";

// Redis mockeado en memoria para probar la lógica de throttling sin servidor.
const store = new Map<string, number>();
const ttls  = new Map<string, number>();
vi.mock("./redis.client.js", () => ({
  default: {
    incr:   vi.fn(async (k: string) => { const n = (store.get(k) ?? 0) + 1; store.set(k, n); return n; }),
    expire: vi.fn(async (k: string, s: number) => { ttls.set(k, s); return 1; }),
    set:    vi.fn(async (k: string, _v: string, _ex: string, s: number) => { store.set(k, 1); ttls.set(k, s); return "OK"; }),
    del:    vi.fn(async (...ks: string[]) => { ks.forEach((k) => { store.delete(k); ttls.delete(k); }); return ks.length; }),
    ttl:    vi.fn(async (k: string) => (ttls.has(k) ? ttls.get(k)! : -2)),
  },
}));

import { segundosBloqueo, registrarFallo, limpiarFallos, _config } from "./login-throttle.js";

describe("login-throttle", () => {
  beforeEach(() => { store.clear(); ttls.clear(); vi.clearAllMocks(); });

  it("no bloquea antes del máximo de fallos", async () => {
    for (let i = 1; i < _config.MAX_FALLOS; i++) {
      const r = await registrarFallo("a@b.co");
      expect(r.bloqueado).toBe(false);
    }
    expect(await segundosBloqueo("a@b.co")).toBe(0);
  });

  it("bloquea al alcanzar el máximo de fallos", async () => {
    let last;
    for (let i = 0; i < _config.MAX_FALLOS; i++) last = await registrarFallo("a@b.co");
    expect(last!.bloqueado).toBe(true);
    expect(await segundosBloqueo("a@b.co")).toBe(_config.BLOQUEO_S);
  });

  it("es case-insensitive por email", async () => {
    for (let i = 0; i < _config.MAX_FALLOS; i++) await registrarFallo("A@B.CO");
    expect(await segundosBloqueo("a@b.co")).toBeGreaterThan(0);
  });

  it("limpiarFallos quita el bloqueo y el contador", async () => {
    for (let i = 0; i < _config.MAX_FALLOS; i++) await registrarFallo("a@b.co");
    await limpiarFallos("a@b.co");
    expect(await segundosBloqueo("a@b.co")).toBe(0);
  });
});
