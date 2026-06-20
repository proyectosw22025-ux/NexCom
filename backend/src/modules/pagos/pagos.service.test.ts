import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";

import { pagosRepository } from "./pagos.repository.js";
import { cuponesService } from "../cupones/cupones.service.js";
import { pagosService } from "./pagos.service.js";

vi.mock("./pagos.repository.js", () => ({
  pagosRepository: {
    findCarritoConItems:          vi.fn(),
    findDireccionConSnapshot:     vi.fn(),
    crearOrdenConItems:           vi.fn(),
    crearUsoCupon:                vi.fn(),
    guardarStripePaymentIntentId: vi.fn(),
    findOrdenConParticipantes:    vi.fn(),
    confirmarPagoSimulado:        vi.fn(),
    limpiarCarrito:               vi.fn(),
  },
}));

vi.mock("../cupones/cupones.service.js", () => ({
  cuponesService: { validar: vi.fn() },
}));

vi.mock("../saldos/saldos.service.js", () => ({
  saldosService: { registrarVenta: vi.fn(), registrarReembolso: vi.fn() },
}));

vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

const prisma = {} as PrismaClient;

// Stripe mockeado: solo paymentIntents.create
const paymentIntentsCreate = vi.fn();
const stripe = { paymentIntents: { create: paymentIntentsCreate } } as unknown as Stripe;

const itemValido = {
  productoId:     "prod-1",
  cantidad:       2,
  precioSnapshot: "50.00",
  producto: { nombre: "Producto 1", activo: true, stock: 10, vendedorId: "vendedor-1" },
};

const direccionValida = {
  activo: true, alias: "Casa", destinatario: "Juan", calle: "Av. 1",
  zona: "Centro", ciudad: "Santa Cruz", departamento: "Santa Cruz", referencia: null,
};

describe("pagosService.crearPaymentIntent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea orden + PaymentIntent y devuelve clientSecret/ordenId", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [itemValido] } as never);
    vi.mocked(pagosRepository.findDireccionConSnapshot).mockResolvedValue(direccionValida as never);
    vi.mocked(pagosRepository.crearOrdenConItems).mockResolvedValue({ id: "orden-1" } as never);
    paymentIntentsCreate.mockResolvedValue({ id: "pi_123", client_secret: "secret_123" });

    const result = await pagosService.crearPaymentIntent(
      "comprador-1", "usuario-1", "dir-1", null, prisma, stripe,
    );

    expect(result).toEqual({ clientSecret: "secret_123", ordenId: "orden-1" });
    // subtotal 2 × 50 = 100 USD → 10000 centavos
    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10000, currency: "usd" }),
    );
    expect(pagosRepository.guardarStripePaymentIntentId).toHaveBeenCalledWith("orden-1", "pi_123", prisma);
  });

  it("aplica el descuento del cupón al monto cobrado", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [itemValido] } as never);
    vi.mocked(pagosRepository.findDireccionConSnapshot).mockResolvedValue(direccionValida as never);
    vi.mocked(pagosRepository.crearOrdenConItems).mockResolvedValue({ id: "orden-1" } as never);
    vi.mocked(cuponesService.validar).mockResolvedValue({ cuponId: "cup-1", descuento: "20" } as never);
    paymentIntentsCreate.mockResolvedValue({ id: "pi_123", client_secret: "secret_123" });

    await pagosService.crearPaymentIntent("comprador-1", "usuario-1", "dir-1", "DESCUENTO20", prisma, stripe);

    // 100 − 20 = 80 USD → 8000 centavos
    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 8000 }),
    );
    expect(pagosRepository.crearUsoCupon).toHaveBeenCalled();
  });

  it("rechaza si el carrito está vacío", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [] } as never);

    await expect(
      pagosService.crearPaymentIntent("comprador-1", "usuario-1", "dir-1", null, prisma, stripe),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });

    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("rechaza si un producto ya no está activo", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({
      items: [{ ...itemValido, producto: { ...itemValido.producto, activo: false } }],
    } as never);

    await expect(
      pagosService.crearPaymentIntent("comprador-1", "usuario-1", "dir-1", null, prisma, stripe),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("rechaza si no hay stock suficiente", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({
      items: [{ ...itemValido, cantidad: 99 }],
    } as never);

    await expect(
      pagosService.crearPaymentIntent("comprador-1", "usuario-1", "dir-1", null, prisma, stripe),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("lanza NOT_FOUND si la dirección no existe o está inactiva", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [itemValido] } as never);
    vi.mocked(pagosRepository.findDireccionConSnapshot).mockResolvedValue(null);

    await expect(
      pagosService.crearPaymentIntent("comprador-1", "usuario-1", "dir-1", null, prisma, stripe),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });

    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });
});

describe("pagosService — flujo boliviano simulado", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crearOrdenSimulada (transferencia): crea la orden en BOB y NO confirma de inmediato", async () => {
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [itemValido] } as never);
    vi.mocked(pagosRepository.findDireccionConSnapshot).mockResolvedValue(direccionValida as never);
    vi.mocked(pagosRepository.crearOrdenConItems).mockResolvedValue({ id: "orden-1", total: { toString: () => "100" } } as never);

    const r = await pagosService.crearOrdenSimulada("comprador-1", "usuario-1", "dir-1", null, "transferencia", "domicilio", prisma);

    expect(r.ordenIds).toEqual(["orden-1"]);
    expect(r.metodoPago).toBe("transferencia");
    // moneda BOB y método correctos
    expect(pagosRepository.crearOrdenConItems).toHaveBeenCalledWith(
      expect.objectContaining({ metodoPago: "transferencia", moneda: "BOB" }), prisma,
    );
    // transferencia NO confirma automáticamente
    expect(pagosRepository.confirmarPagoSimulado).not.toHaveBeenCalled();
  });

  it("crearOrdenSimulada divide el carrito en una orden por vendedor (split)", async () => {
    const itemV2 = { ...itemValido, productoId: "prod-2", producto: { ...itemValido.producto, vendedorId: "vendedor-2" } };
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [itemValido, itemV2] } as never);
    vi.mocked(pagosRepository.findDireccionConSnapshot).mockResolvedValue(direccionValida as never);
    vi.mocked(pagosRepository.crearOrdenConItems)
      .mockResolvedValueOnce({ id: "orden-A" } as never)
      .mockResolvedValueOnce({ id: "orden-B" } as never);

    const r = await pagosService.crearOrdenSimulada("comprador-1", "usuario-1", "dir-1", null, "transferencia", "domicilio", prisma);

    expect(r.ordenIds).toEqual(["orden-A", "orden-B"]); // una orden por cada vendedor
    expect(pagosRepository.crearOrdenConItems).toHaveBeenCalledTimes(2);
  });

  it("crearOrdenSimulada rechaza cupón en carrito multi-vendedor", async () => {
    const itemV2 = { ...itemValido, productoId: "prod-2", producto: { ...itemValido.producto, vendedorId: "vendedor-2" } };
    vi.mocked(pagosRepository.findCarritoConItems).mockResolvedValue({ items: [itemValido, itemV2] } as never);
    vi.mocked(pagosRepository.findDireccionConSnapshot).mockResolvedValue(direccionValida as never);

    await expect(
      pagosService.crearOrdenSimulada("comprador-1", "usuario-1", "dir-1", "PROMO", "transferencia", "domicilio", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(pagosRepository.crearOrdenConItems).not.toHaveBeenCalled();
  });

  it("crearOrdenSimulada rechaza un método inválido", async () => {
    await expect(
      pagosService.crearOrdenSimulada("comprador-1", "usuario-1", "dir-1", null, "bitcoin", "domicilio", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(pagosRepository.crearOrdenConItems).not.toHaveBeenCalled();
  });

  it("confirmarPagoSimulado: confirma la orden y notifica a comprador y vendedor", async () => {
    const notifCreate = vi.fn().mockResolvedValue({
      id: "n1", tipo: "X", titulo: "t", mensaje: "m", leido: false, url: null, ordenId: "orden-1",
      creadoEn: new Date(),
    });
    const prismaConNotif = { notificacion: { create: notifCreate } } as unknown as PrismaClient;

    vi.mocked(pagosRepository.findOrdenConParticipantes).mockResolvedValue({
      id: "orden-1", estado: "PENDIENTE_PAGO", total: { toString: () => "100" },
      pago: { id: "pago-1", metodo: "qr" },
      comprador: { id: "comprador-1", usuarioId: "u-comprador" },
      vendedor:  { id: "vendedor-1", usuarioId: "u-vendedor", plan: "FREE" },
    } as never);

    const r = await pagosService.confirmarPagoSimulado(["orden-1"], "comprador-1", "usuario-1", prismaConNotif);

    expect(r).toMatchObject({ ordenIds: ["orden-1"], estado: "PAGADO" });
    expect(pagosRepository.confirmarPagoSimulado).toHaveBeenCalled();
    expect(pagosRepository.limpiarCarrito).toHaveBeenCalledWith("comprador-1", prismaConNotif);
    expect(notifCreate).toHaveBeenCalledTimes(2); // comprador + vendedor
  });

  it("confirmarPagoSimulado rechaza si la orden no es del comprador", async () => {
    vi.mocked(pagosRepository.findOrdenConParticipantes).mockResolvedValue({
      id: "orden-1", estado: "PENDIENTE_PAGO", pago: { id: "p", metodo: "qr" },
      comprador: { id: "OTRO", usuarioId: "x" }, vendedor: { id: "v", usuarioId: "y" },
    } as never);

    await expect(
      pagosService.confirmarPagoSimulado(["orden-1"], "comprador-1", "usuario-1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });

  it("confirmarPagoSimulado rechaza una orden ya procesada", async () => {
    vi.mocked(pagosRepository.findOrdenConParticipantes).mockResolvedValue({
      id: "orden-1", estado: "PAGADO", pago: { id: "p", metodo: "qr" },
      comprador: { id: "comprador-1", usuarioId: "x" }, vendedor: { id: "v", usuarioId: "y" },
    } as never);

    await expect(
      pagosService.confirmarPagoSimulado(["orden-1"], "comprador-1", "usuario-1", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });
});
