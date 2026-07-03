import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

/**
 * Valida las 5 condiciones del flujo de recojo (Compra Protegida):
 *   1. autenticado (guard del resolver — fuera de este alcance)
 *   2. la orden pertenece al usuario
 *   3. QR del paquete válido
 *   4. QR no utilizado (orden aún en garantía)
 *   5. OTP temporal válido y vigente
 * y que el éxito entregue + libere exactamente una vez.
 */

vi.mock("./ordenes.repository.js", () => ({
  ordenesRepository: {
    marcarEntregada:     vi.fn().mockResolvedValue({}),
    findOneByComprador:  vi.fn().mockResolvedValue({ id: "orden-1", estado: "ENTREGADO" }),
  },
}));
vi.mock("../saldos/saldos.service.js", () => ({
  saldosService: { liberarFondos: vi.fn() },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

import { ordenesRepository } from "./ordenes.repository.js";
import { saldosService } from "../saldos/saldos.service.js";
import { ordenesService } from "./ordenes.service.js";

const ordenBase = {
  id: "orden-1", compradorId: "comp-1", vendedorId: "vend-1",
  estado: "ENVIADO", fondosLiberadosEn: null,
  codigoEntrega: "654321", intentosCodigo: 0, codigoBloqueadoHasta: null,
  otpEntrega: "111222", otpEntregaExp: new Date(Date.now() + 5 * 60_000),
};

function prismaCon(orden: Partial<typeof ordenBase> | null) {
  return {
    orden: {
      findFirst: vi.fn().mockResolvedValue(orden ? { ...ordenBase, ...orden } : null),
      update:    vi.fn().mockResolvedValue({}),
    },
    eventoSeguridad: { create: vi.fn().mockResolvedValue({}) },
  } as unknown as PrismaClient;
}

describe("ordenesService.confirmarRecojo (escaneo del QR del paquete)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("éxito: QR y OTP correctos → entrega + libera la garantía", async () => {
    const prisma = prismaCon({});
    await ordenesService.confirmarRecojo("orden-1", "comp-1", "user-1", "654321", "111222", prisma);
    expect(ordenesRepository.marcarEntregada).toHaveBeenCalledWith("orden-1", "user-1", prisma);
    expect(saldosService.liberarFondos).toHaveBeenCalledWith("vend-1", "orden-1", prisma);
  });

  it("(2) rechaza si la orden no pertenece al comprador", async () => {
    const prisma = prismaCon(null); // findFirst con compradorId ajeno → null
    await expect(
      ordenesService.confirmarRecojo("orden-1", "otro-comprador", "user-x", "654321", "111222", prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
    expect(saldosService.liberarFondos).not.toHaveBeenCalled();
  });

  it("(3) rechaza un QR que no corresponde al paquete (y cuenta el intento)", async () => {
    const prisma = prismaCon({});
    await expect(
      ordenesService.confirmarRecojo("orden-1", "comp-1", "user-1", "000000", "111222", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(saldosService.liberarFondos).not.toHaveBeenCalled();
    // registró el intento fallido para el anti–fuerza bruta
    expect((prisma as never as { eventoSeguridad: { create: ReturnType<typeof vi.fn> } }).eventoSeguridad.create).toHaveBeenCalled();
  });

  it("(4) rechaza si el QR ya fue utilizado (orden entregada / fondos liberados)", async () => {
    const prisma = prismaCon({ estado: "ENTREGADO", fondosLiberadosEn: new Date() as never });
    await expect(
      ordenesService.confirmarRecojo("orden-1", "comp-1", "user-1", "654321", "111222", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(saldosService.liberarFondos).not.toHaveBeenCalled();
  });

  it("(5) rechaza un OTP expirado", async () => {
    const prisma = prismaCon({ otpEntregaExp: new Date(Date.now() - 1000) });
    await expect(
      ordenesService.confirmarRecojo("orden-1", "comp-1", "user-1", "654321", "111222", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("(5) rechaza un OTP incorrecto", async () => {
    const prisma = prismaCon({});
    await expect(
      ordenesService.confirmarRecojo("orden-1", "comp-1", "user-1", "654321", "999999", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("bloquea temporalmente tras demasiados intentos de QR fallidos", async () => {
    const prisma = prismaCon({ intentosCodigo: 4 }); // el 5º fallo gatilla el bloqueo
    await expect(
      ordenesService.confirmarRecojo("orden-1", "comp-1", "user-1", "000000", "111222", prisma),
    ).rejects.toMatchObject({ message: expect.stringContaining("bloqueó") });
  });
});

describe("ordenesService.iniciarRecojo (sesión OTP)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("genera un OTP de 6 dígitos con expiración para una orden ENVIADA propia", async () => {
    const prisma = prismaCon({});
    const r = await ordenesService.iniciarRecojo("orden-1", "comp-1", prisma);
    expect(r.otp).toMatch(/^\d{6}$/);
    expect(new Date(r.expiraEn).getTime()).toBeGreaterThan(Date.now());
  });

  it("rechaza iniciar el recojo si la orden no está ENVIADA", async () => {
    const prisma = prismaCon({ estado: "PAGADO" });
    await expect(
      ordenesService.iniciarRecojo("orden-1", "comp-1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
