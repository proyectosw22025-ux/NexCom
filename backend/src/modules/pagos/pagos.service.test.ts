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
  },
}));

vi.mock("../cupones/cupones.service.js", () => ({
  cuponesService: { validar: vi.fn() },
}));

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
