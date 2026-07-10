import { GraphQLError } from "graphql";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import { devolucionesRepository } from "./devoluciones.repository.js";
import { saldosService } from "../saldos/saldos.service.js";
import { creditoService } from "../credito/credito.service.js";
import { publishNotificacion } from "../../shared/pubsub.js";

// Reglas de negocio
const ESTADOS_ELEGIBLES = ["ENTREGADO", "COMPLETADO"]; // solo se devuelve lo ya recibido
const DEVOLUCION_DIAS    = 7;                            // ventana desde la entrega
const MOTIVO_MIN         = 5;
const TIPOS_PROBLEMA     = ["DEFECTUOSO", "NO_CORRESPONDE", "INCOMPLETO", "OTRO"];
const MAX_EVIDENCIA      = 5;
const DIAS_AUTO_RESOLVER = 5;                           // el vendedor que ignora N días pierde la devolución

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}

type DevolucionRow = {
  id: string; ordenId: string; motivo?: string; estado: string;
  tipoProblema?: string | null; evidenciaUrls?: string[];
  montoReembolso: { toString(): string }; respuestaVendedor?: string | null; creadoEn?: Date;
};

function mapDevolucion(d: DevolucionRow, otroNombre: string) {
  return {
    id:                d.id,
    ordenId:           d.ordenId,
    motivo:            d.motivo ?? "",
    tipoProblema:      d.tipoProblema ?? null,
    evidenciaUrls:     d.evidenciaUrls ?? [],
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
    tipoProblema: string | null | undefined,
    evidenciaUrls: string[] | null | undefined,
    prisma: PrismaClient,
  ) {
    void usuarioId;
    const texto = motivo.trim();
    if (texto.length < MOTIVO_MIN) {
      throw bad("Cuéntanos el motivo de la devolución (mínimo unas palabras).");
    }
    const tipo = (tipoProblema ?? "OTRO").toUpperCase();
    if (!TIPOS_PROBLEMA.includes(tipo)) {
      throw bad("Tipo de problema inválido.");
    }
    const evidencia = (evidenciaUrls ?? []).filter((u) => /^https?:\/\/\S+/.test(u)).slice(0, MAX_EVIDENCIA);

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
        tipoProblema:   tipo,
        evidenciaUrls:  evidencia,
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
      // Reembolso + restock atómico
      actualizada = await devolucionesRepository.reembolsar(id, nota, dev.orden!.items, prisma);
      // 1) Revertir el neto acreditado al vendedor (clawback de su saldo)
      await saldosService.registrarReembolso(dev.vendedor!.id, dev.ordenId, prisma);
      // 2) Acreditar el total a la BILLETERA del comprador (a dónde vuelve la plata)
      await creditoService.acreditarReembolso(
        dev.comprador!.id, dev.ordenId, new Decimal(dev.montoReembolso.toString()), prisma,
      );
      await notificar(
        prisma, dev.comprador!.usuarioId, "DEVOLUCION_RESUELTA", "Devolución aprobada",
        `Tu devolución de la orden #${idCorto} fue aprobada. Se acreditó Bs. ${dev.montoReembolso.toString()} a tu billetera.`,
        `/comprador/saldo`,
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

  /**
   * Auto-resolución (cron): las devoluciones que el vendedor ignora por más de
   * DIAS_AUTO_RESOLVER días se aprueban a favor del comprador. Protege al
   * comprador de vendedores que nunca responden. Reusa el camino de aprobación
   * (reembolso + clawback + billetera) y es idempotente por los movimientos.
   */
  async autoResolverVencidas(prisma: PrismaClient) {
    const limite = new Date(Date.now() - DIAS_AUTO_RESOLVER * 86_400_000);
    const vencidas = await devolucionesRepository.findSolicitadasVencidas(limite, prisma);
    for (const dev of vencidas) {
      const idCorto = dev.ordenId.slice(-6).toUpperCase();
      const nota = "Aprobada automáticamente: el vendedor no respondió a tiempo.";
      await devolucionesRepository.reembolsar(dev.id, nota, dev.orden!.items, prisma);
      await saldosService.registrarReembolso(dev.vendedor!.id, dev.ordenId, prisma);
      await creditoService.acreditarReembolso(
        dev.comprador!.id, dev.ordenId, new Decimal(dev.montoReembolso.toString()), prisma,
      );
      await notificar(
        prisma, dev.comprador!.usuarioId, "DEVOLUCION_RESUELTA", "Devolución aprobada automáticamente",
        `Tu devolución de la orden #${idCorto} se aprobó porque el vendedor no respondió. Se acreditó Bs. ${dev.montoReembolso.toString()} a tu billetera.`,
        `/comprador/saldo`,
      );
      await notificar(
        prisma, dev.vendedor!.usuarioId, "DEVOLUCION_RESUELTA", "Devolución aprobada por inacción",
        `La devolución de la orden #${idCorto} se aprobó automáticamente por falta de respuesta.`,
        `/vendedor/devoluciones`,
      );
    }
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
