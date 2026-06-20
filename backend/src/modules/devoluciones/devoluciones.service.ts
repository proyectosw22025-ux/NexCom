import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { devolucionesRepository } from "./devoluciones.repository.js";
import { publishNotificacion } from "../../shared/pubsub.js";

// Reglas de negocio
const ESTADOS_ELEGIBLES = ["ENTREGADO", "COMPLETADO"]; // solo se devuelve lo ya recibido
const DEVOLUCION_DIAS    = 7;                            // ventana desde la entrega
const MOTIVO_MIN         = 5;

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

type DevolucionRow = {
  id: string; ordenId: string; motivo?: string; estado: string;
  montoReembolso: { toString(): string }; respuestaVendedor?: string | null; creadoEn?: Date;
};

function mapDevolucion(d: DevolucionRow, otroNombre: string) {
  return {
    id:                d.id,
    ordenId:           d.ordenId,
    motivo:            d.motivo ?? "",
    estado:            d.estado,
    montoReembolso:    d.montoReembolso.toString(),
    respuestaVendedor: d.respuestaVendedor ?? null,
    creadoEn:          (d.creadoEn ?? new Date()).toISOString(),
    ordenIdCorto:      d.ordenId.slice(-6).toUpperCase(),
    otroNombre,
  };
}

async function notificar(
  prisma: PrismaClient,
  usuarioId: string, tipo: string, titulo: string, mensaje: string, url: string,
) {
  const n = await prisma.notificacion.create({ data: { usuarioId, tipo, titulo, mensaje, url } });
  publishNotificacion(usuarioId, {
    id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
    leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
  });
}

export const devolucionesService = {
  async solicitar(
    compradorId: string,
    usuarioId: string,
    ordenId: string,
    motivo: string,
    prisma: PrismaClient,
  ) {
    const texto = motivo.trim();
    if (texto.length < MOTIVO_MIN) {
      throw bad("Cuéntanos el motivo de la devolución (mínimo unas palabras).");
    }

    const orden = await devolucionesRepository.findOrdenParaDevolucion(ordenId, prisma);
    if (!orden || orden.comprador?.id !== compradorId) {
      throw new GraphQLError("Orden no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (!ESTADOS_ELEGIBLES.includes(orden.estado)) {
      throw bad("Solo puedes solicitar la devolución de una orden ya entregada.");
    }
    if (orden.devolucion) {
      throw bad("Ya existe una solicitud de devolución para esta orden.");
    }

    // Ventana de devolución desde la fecha de entrega
    const fechaEntrega = orden.historialEstados[0]?.creadoEn;
    if (fechaEntrega) {
      const limite = new Date(fechaEntrega.getTime() + DEVOLUCION_DIAS * 24 * 60 * 60 * 1000);
      if (new Date() > limite) {
        throw bad(`El plazo para devolver esta orden (${DEVOLUCION_DIAS} días desde la entrega) ya venció.`);
      }
    }

    const devolucion = await devolucionesRepository.crear(
      {
        ordenId,
        compradorId,
        vendedorId:     orden.vendedor!.id,
        motivo:         texto,
        montoReembolso: new Decimal(orden.total.toString()),
      },
      prisma,
    );

    await notificar(
      prisma, orden.vendedor!.usuarioId, "NUEVA_DEVOLUCION", "Solicitud de devolución",
      `Una orden #${ordenId.slice(-6).toUpperCase()} tiene una solicitud de devolución.`,
      "/vendedor/devoluciones",
    );

    return mapDevolucion(devolucion as DevolucionRow, orden.vendedor!.nombreNegocio);
  },

  async responder(
    vendedorId: string,
    _usuarioId: string,
    id: string,
    aprobar: boolean,
    respuesta: string | null | undefined,
    prisma: PrismaClient,
  ) {
    const dev = await devolucionesRepository.findConParticipantes(id, prisma);
    if (!dev || dev.vendedor?.id !== vendedorId) {
      throw new GraphQLError("Devolución no encontrada.", { extensions: { code: "NOT_FOUND" } });
    }
    if (dev.estado !== "SOLICITADA") {
      throw bad("Esta devolución ya fue resuelta.");
    }

    const nota = respuesta?.trim() || null;
    const idCorto = dev.ordenId.slice(-6).toUpperCase();

    let actualizada;
    if (aprobar) {
      // Reembolso simulado + restock atómico
      actualizada = await devolucionesRepository.reembolsar(id, nota, dev.orden!.items, prisma);
      await notificar(
        prisma, dev.comprador!.usuarioId, "DEVOLUCION_RESUELTA", "Devolución aprobada",
        `Tu devolución de la orden #${idCorto} fue aprobada. Se reembolsará Bs. ${dev.montoReembolso.toString()}.`,
        `/comprador/ordenes/${dev.ordenId}`,
      );
    } else {
      actualizada = await devolucionesRepository.rechazar(id, nota, prisma);
      await notificar(
        prisma, dev.comprador!.usuarioId, "DEVOLUCION_RESUELTA", "Devolución rechazada",
        `Tu devolución de la orden #${idCorto} fue rechazada.${nota ? ` Motivo: ${nota}` : ""}`,
        `/comprador/ordenes/${dev.ordenId}`,
      );
    }
    return mapDevolucion(actualizada as DevolucionRow, "");
  },

  async getMisDevoluciones(compradorId: string, prisma: PrismaClient) {
    const rows = await devolucionesRepository.findByComprador(compradorId, prisma);
    return rows.map((d) => mapDevolucion(d as DevolucionRow, d.vendedor.nombreNegocio));
  },

  async getDevolucionesVendedor(vendedorId: string, prisma: PrismaClient) {
    const rows = await devolucionesRepository.findByVendedor(vendedorId, prisma);
    return rows.map((d) => mapDevolucion(d as DevolucionRow, d.comprador.nombreCompleto));
  },

  async getDevolucionDeOrden(ordenId: string, compradorId: string, prisma: PrismaClient) {
    const d = await devolucionesRepository.findByOrden(ordenId, prisma);
    if (!d || d.compradorId !== compradorId) return null; // no filtrar devoluciones ajenas
    return mapDevolucion(d as DevolucionRow, "");
  },
};
