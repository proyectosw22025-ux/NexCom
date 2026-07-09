import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";
import { disputasRepository } from "./disputas.repository.js";
import { saldosService } from "../saldos/saldos.service.js";
import { creditoService } from "../credito/credito.service.js";
import { publishNotificacion } from "../../shared/pubsub.js";

const MOTIVOS_VALIDOS  = ["NO_RECIBIDO", "PRODUCTO_INCORRECTO", "DANADO", "OTRO"];
const ESTADOS_ABRIBLES = ["PAGADO", "EN_PREPARACION", "ENVIADO"]; // mientras el pago sigue retenido

function bad(msg: string) {
  return new GraphQLError(msg, { extensions: { code: "BAD_USER_INPUT" } });
}
function notFound(msg = "Disputa no encontrada.") {
  return new GraphQLError(msg, { extensions: { code: "NOT_FOUND" } });
}

async function notificar(
  prisma: PrismaClient, usuarioId: string, tipo: string, titulo: string, mensaje: string, url: string, ordenId?: string,
) {
  const n = await prisma.notificacion.create({ data: { usuarioId, tipo, titulo, mensaje, url, ordenId: ordenId ?? null } });
  publishNotificacion(usuarioId, {
    id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje,
    leido: n.leido, url: n.url, ordenId: n.ordenId, creadoEn: n.creadoEn.toISOString(),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDisputa(d: any) {
  return {
    id: d.id,
    ordenId: d.ordenId,
    ordenCorto: d.ordenId.slice(-6).toUpperCase(),
    motivo: d.motivo,
    descripcion: d.descripcion ?? null,
    evidenciaUrl: d.evidenciaUrl ?? null,
    estado: d.estado,
    resolucionNota: d.resolucionNota ?? null,
    total: d.orden?.total ? d.orden.total.toString() : null,
    compradorNombre: d.orden?.comprador?.nombreCompleto ?? null,
    vendedorNombre: d.orden?.vendedor?.nombreNegocio ?? null,
    creadoEn: d.creadoEn.toISOString(),
    resueltoEn: d.resueltoEn ? d.resueltoEn.toISOString() : null,
  };
}

export const disputasService = {
  async abrir(
    compradorId: string, usuarioId: string,
    input: { ordenId: string; motivo: string; descripcion?: string | null; evidenciaUrl?: string | null },
    prisma: PrismaClient,
  ) {
    if (!MOTIVOS_VALIDOS.includes(input.motivo)) throw bad("Motivo de reclamo inválido.");

    const orden = await prisma.orden.findFirst({
      where:   { id: input.ordenId, compradorId },
      include: { vendedor: { select: { usuarioId: true } } },
    });
    if (!orden) throw notFound("Orden no encontrada.");
    if (orden.fondosLiberadosEn) throw bad("Esta orden ya fue liberada. Si recibiste el producto, abre una devolución.");
    if (!ESTADOS_ABRIBLES.includes(orden.estado)) throw bad("Solo puedes abrir un reclamo mientras tu pago está retenido en garantía.");
    if (await disputasRepository.findDeOrden(input.ordenId, prisma)) throw bad("Ya existe un reclamo abierto para esta orden.");

    const disputa = await disputasRepository.crear({
      ordenId: input.ordenId, compradorId, vendedorId: orden.vendedorId, motivo: input.motivo,
      descripcion: input.descripcion?.trim() || null, evidenciaUrl: input.evidenciaUrl?.trim() || null,
    }, prisma);

    await prisma.eventoSeguridad.create({ data: { tipo: "DISPUTA_ABIERTA", usuarioId, ordenId: input.ordenId, metadata: { motivo: input.motivo } } });

    const idCorto = input.ordenId.slice(-6).toUpperCase();
    await notificar(prisma, orden.vendedor!.usuarioId, "DISPUTA_ABIERTA", "Reclamo abierto",
      `El comprador abrió un reclamo en la orden #${idCorto}. La plataforma lo revisará.`, `/vendedor/ordenes/${input.ordenId}`, input.ordenId);
    const admins = await prisma.usuario.findMany({ where: { rol: "ADMIN", activo: true }, select: { id: true } });
    for (const a of admins) {
      await notificar(prisma, a.id, "DISPUTA_ABIERTA", "Nueva disputa por mediar",
        `Disputa abierta en la orden #${idCorto} (${input.motivo}).`, "/admin/disputas", input.ordenId);
    }
    return mapDisputa(disputa);
  },

  async resolver(
    adminUsuarioId: string,
    input: { disputaId: string; aFavor: string; nota?: string | null },
    prisma: PrismaClient,
  ) {
    if (!["COMPRADOR", "VENDEDOR"].includes(input.aFavor)) throw bad("Resolución inválida.");
    const d = await disputasRepository.findConOrden(input.disputaId, prisma);
    if (!d) throw notFound();
    if (d.estado !== "ABIERTA") throw bad("Esta disputa ya fue resuelta.");

    const orden = d.orden;
    const nota = input.nota?.trim() || null;
    const idCorto = d.ordenId.slice(-6).toUpperCase();

    if (input.aFavor === "COMPRADOR") {
      await disputasRepository.resolverReembolso(input.disputaId, d.ordenId, adminUsuarioId, nota, orden.items, prisma);
      await saldosService.registrarReembolso(d.vendedorId, d.ordenId, prisma);
      // Acredita el total a la billetera del comprador (dinero de vuelta)
      await creditoService.acreditarReembolso(orden.comprador!.id, d.ordenId, new Decimal(orden.total.toString()), prisma);
      await notificar(prisma, orden.comprador!.usuarioId, "DISPUTA_RESUELTA", "Reclamo aprobado",
        `Tu reclamo de la orden #${idCorto} fue aprobado. Se acreditó Bs. ${orden.total.toString()} a tu billetera.`, `/comprador/saldo`, d.ordenId);
      await notificar(prisma, orden.vendedor!.usuarioId, "DISPUTA_RESUELTA", "Reclamo resuelto",
        `El reclamo de la orden #${idCorto} se resolvió a favor del comprador (reembolso).`, `/vendedor/ordenes/${d.ordenId}`, d.ordenId);
    } else {
      await disputasRepository.resolverLiberacion(input.disputaId, d.ordenId, adminUsuarioId, nota, prisma);
      await saldosService.liberarFondos(d.vendedorId, d.ordenId, prisma);
      await notificar(prisma, orden.vendedor!.usuarioId, "DISPUTA_RESUELTA", "Reclamo resuelto a tu favor",
        `El reclamo de la orden #${idCorto} se resolvió a tu favor. Tu pago fue liberado.`, `/vendedor/ordenes/${d.ordenId}`, d.ordenId);
      await notificar(prisma, orden.comprador!.usuarioId, "DISPUTA_RESUELTA", "Reclamo cerrado",
        `Tu reclamo de la orden #${idCorto} fue revisado y se liberó el pago al vendedor.`, `/comprador/ordenes/${d.ordenId}`, d.ordenId);
    }

    await prisma.eventoSeguridad.create({ data: { tipo: "DISPUTA_RESUELTA", usuarioId: adminUsuarioId, ordenId: d.ordenId, metadata: { aFavor: input.aFavor } } });
    return mapDisputa(await disputasRepository.findConOrden(input.disputaId, prisma));
  },

  async getMisDisputas(compradorId: string, prisma: PrismaClient) {
    return (await disputasRepository.findByComprador(compradorId, prisma)).map(mapDisputa);
  },

  async getDisputaDeOrden(ordenId: string, prisma: PrismaClient) {
    const d = await disputasRepository.findDeOrden(ordenId, prisma);
    return d ? mapDisputa(d) : null;
  },

  async getPendientes(prisma: PrismaClient) {
    return (await disputasRepository.listPorEstado(true, prisma)).map(mapDisputa);
  },

  async getResueltas(prisma: PrismaClient) {
    return (await disputasRepository.listPorEstado(false, prisma)).map(mapDisputa);
  },
};
