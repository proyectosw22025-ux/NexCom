import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { mensajesRepository } from "./mensajes.repository.js";
import { publishNotificacion } from "../../shared/pubsub.js";

interface UsuarioCtx {
  id: string;
  rol: string;
  perfilCompradorId?: string | null;
  perfilVendedorId?: string | null;
}

export const mensajesService = {
  async getConversaciones(user: UsuarioCtx, prisma: PrismaClient) {
    const esComprador = user.rol === "COMPRADOR";
    const perfilId = esComprador ? user.perfilCompradorId : user.perfilVendedorId;
    if (!perfilId) return [];

    const convs = await mensajesRepository.findConversaciones(
      esComprador ? { compradorId: perfilId } : { vendedorId: perfilId }, prisma,
    );
    const noLeidos = await mensajesRepository.contarNoLeidos(convs.map((c) => c.id), user.id, prisma);

    return convs
      .map((c) => ({
        id:           c.id,
        productoId:   c.productoId,
        otroNombre:   esComprador ? c.vendedor.nombreNegocio : c.comprador.nombreCompleto,
        ultimoMensaje: c.mensajes[0]?.contenido ?? null,
        actualizadoEn: (c.mensajes[0]?.creadoEn ?? c.creadoEn).toISOString(),
        noLeidos:     noLeidos.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  },

  async iniciar(perfilCompradorId: string, vendedorId: string, productoId: string | null, prisma: PrismaClient) {
    const conv = await mensajesRepository.findOrCreate(perfilCompradorId, vendedorId, productoId, prisma);
    return conv.id;
  },

  async getMensajes(conversacionId: string, usuarioId: string, prisma: PrismaClient) {
    const conv = await mensajesRepository.findParticipantes(conversacionId, prisma);
    if (!conv) throw new GraphQLError("Conversación no encontrada.", { extensions: { code: "NOT_FOUND" } });
    if (![conv.comprador.usuarioId, conv.vendedor.usuarioId].includes(usuarioId)) {
      throw new GraphQLError("No tienes acceso a esta conversación.", { extensions: { code: "FORBIDDEN" } });
    }
    await mensajesRepository.marcarLeidos(conversacionId, usuarioId, prisma);
    const mensajes = await mensajesRepository.findMensajes(conversacionId, prisma);
    return mensajes.map((m) => ({
      id: m.id, contenido: m.contenido, esMio: m.emisorId === usuarioId,
      leido: m.leido, creadoEn: m.creadoEn.toISOString(),
    }));
  },

  async enviar(conversacionId: string, usuarioId: string, contenido: string, prisma: PrismaClient) {
    const texto = contenido.trim();
    if (!texto) throw new GraphQLError("El mensaje está vacío.", { extensions: { code: "BAD_USER_INPUT" } });
    if (texto.length > 1000) {
      throw new GraphQLError("El mensaje es demasiado largo.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const conv = await mensajesRepository.findParticipantes(conversacionId, prisma);
    if (!conv) throw new GraphQLError("Conversación no encontrada.", { extensions: { code: "NOT_FOUND" } });
    if (![conv.comprador.usuarioId, conv.vendedor.usuarioId].includes(usuarioId)) {
      throw new GraphQLError("No tienes acceso a esta conversación.", { extensions: { code: "FORBIDDEN" } });
    }

    const msg = await mensajesRepository.crearMensaje(conversacionId, usuarioId, texto, prisma);

    // Notificar al otro participante (infra realtime existente)
    const otro = conv.comprador.usuarioId === usuarioId ? conv.vendedor.usuarioId : conv.comprador.usuarioId;
    const notif = await prisma.notificacion.create({
      data: {
        usuarioId: otro, tipo: "NUEVO_MENSAJE", titulo: "Nuevo mensaje",
        mensaje: texto.length > 60 ? `${texto.slice(0, 60)}…` : texto,
        url: `/mensajes?c=${conversacionId}`,
      },
    });
    publishNotificacion(otro, {
      id: notif.id, tipo: notif.tipo, titulo: notif.titulo, mensaje: notif.mensaje,
      leido: notif.leido, url: notif.url, ordenId: notif.ordenId, creadoEn: notif.creadoEn.toISOString(),
    });

    return { id: msg.id, contenido: msg.contenido, esMio: true, leido: msg.leido, creadoEn: msg.creadoEn.toISOString() };
  },
};
