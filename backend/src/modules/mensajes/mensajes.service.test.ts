import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { mensajesRepository } from "./mensajes.repository.js";
import { mensajesService } from "./mensajes.service.js";

vi.mock("./mensajes.repository.js", () => ({
  mensajesRepository: {
    findConversaciones: vi.fn(),
    contarNoLeidos:     vi.fn(),
    findParticipantes:  vi.fn(),
    findOrCreate:       vi.fn(),
    crearMensaje:       vi.fn(),
    findMensajes:       vi.fn(),
    marcarLeidos:       vi.fn(),
  },
}));
vi.mock("../../shared/pubsub.js", () => ({ publishNotificacion: vi.fn() }));

const prisma = {} as PrismaClient;

const conv = {
  comprador: { usuarioId: "u-comprador" },
  vendedor:  { usuarioId: "u-vendedor" },
};

describe("mensajesService.enviar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite a un participante enviar y notifica al otro", async () => {
    const notifCreate = vi.fn().mockResolvedValue({
      id: "n1", tipo: "NUEVO_MENSAJE", titulo: "t", mensaje: "m", leido: false, url: null, ordenId: null, creadoEn: new Date(),
    });
    const prismaN = { notificacion: { create: notifCreate } } as unknown as PrismaClient;

    vi.mocked(mensajesRepository.findParticipantes).mockResolvedValue(conv as never);
    vi.mocked(mensajesRepository.crearMensaje).mockResolvedValue({ id: "m1", contenido: "Hola", leido: false, creadoEn: new Date() } as never);

    const r = await mensajesService.enviar("c1", "u-comprador", "Hola", prismaN);

    expect(r).toMatchObject({ id: "m1", esMio: true });
    expect(notifCreate).toHaveBeenCalledTimes(1); // notifica al otro participante
    // el destinatario es el vendedor (el otro)
    expect(notifCreate.mock.calls[0][0].data.usuarioId).toBe("u-vendedor");
  });

  it("rechaza a quien no es participante (FORBIDDEN)", async () => {
    vi.mocked(mensajesRepository.findParticipantes).mockResolvedValue(conv as never);
    await expect(
      mensajesService.enviar("c1", "intruso", "Hola", prisma),
    ).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
    expect(mensajesRepository.crearMensaje).not.toHaveBeenCalled();
  });

  it("rechaza mensaje vacío", async () => {
    await expect(
      mensajesService.enviar("c1", "u-comprador", "   ", prisma),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("lanza NOT_FOUND si la conversación no existe", async () => {
    vi.mocked(mensajesRepository.findParticipantes).mockResolvedValue(null);
    await expect(
      mensajesService.enviar("cX", "u-comprador", "Hola", prisma),
    ).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
  });
});

describe("mensajesService.getMensajes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca como leídos y devuelve mensajes con esMio correcto", async () => {
    vi.mocked(mensajesRepository.findParticipantes).mockResolvedValue(conv as never);
    vi.mocked(mensajesRepository.findMensajes).mockResolvedValue([
      { id: "m1", contenido: "Hola", emisorId: "u-comprador", leido: true, creadoEn: new Date() },
      { id: "m2", contenido: "Sí", emisorId: "u-vendedor", leido: false, creadoEn: new Date() },
    ] as never);

    const r = await mensajesService.getMensajes("c1", "u-comprador", prisma);

    expect(mensajesRepository.marcarLeidos).toHaveBeenCalledWith("c1", "u-comprador", prisma);
    expect(r[0]).toMatchObject({ id: "m1", esMio: true });
    expect(r[1]).toMatchObject({ id: "m2", esMio: false });
  });

  it("rechaza a un no participante", async () => {
    vi.mocked(mensajesRepository.findParticipantes).mockResolvedValue(conv as never);
    await expect(
      mensajesService.getMensajes("c1", "intruso", prisma),
    ).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
  });
});

describe("mensajesService.getConversaciones", () => {
  beforeEach(() => vi.clearAllMocks());

  it("comprador: muestra el nombre del vendedor como 'otro'", async () => {
    vi.mocked(mensajesRepository.findConversaciones).mockResolvedValue([
      { id: "c1", productoId: null, creadoEn: new Date(),
        comprador: { nombreCompleto: "Juan" }, vendedor: { nombreNegocio: "Tienda X" },
        mensajes: [{ contenido: "Hola", creadoEn: new Date() }] },
    ] as never);
    vi.mocked(mensajesRepository.contarNoLeidos).mockResolvedValue(new Map([["c1", 2]]));

    const r = await mensajesService.getConversaciones(
      { id: "u1", rol: "COMPRADOR", perfilCompradorId: "comp-1" }, prisma,
    );

    expect(r[0]).toMatchObject({ id: "c1", otroNombre: "Tienda X", noLeidos: 2, ultimoMensaje: "Hola" });
  });

  it("devuelve vacío si el usuario no tiene el perfil correspondiente", async () => {
    const r = await mensajesService.getConversaciones(
      { id: "u1", rol: "COMPRADOR", perfilCompradorId: null }, prisma,
    );
    expect(r).toEqual([]);
  });
});
