import { GraphQLError } from "graphql";
import type { PrismaClient, EstadoReporte, TipoReporte } from "@prisma/client";
import { reportesRepository } from "./reportes.repository.js";

const ESTADOS_RESOLUCION: EstadoReporte[] = ["RESUELTO", "RECHAZADO"];

export const reportesService = {
  async crearReporte(
    userId: string,
    tipo: TipoReporte,
    referenciaId: string,
    motivo: string,
    descripcion: string | undefined,
    prisma: PrismaClient,
  ) {
    return reportesRepository.create(
      { reportadorId: userId, tipo, referenciaId, motivo, descripcion },
      prisma,
    );
  },

  async getReportes(
    { estado, tipo, pagina = 1, limite = 20 }: { estado?: EstadoReporte; tipo?: TipoReporte; pagina?: number; limite?: number },
    prisma: PrismaClient,
  ) {
    return reportesRepository.findAll({ estado, tipo }, pagina, Math.min(limite, 100), prisma);
  },

  async resolverReporte(
    id: string,
    estado: EstadoReporte,
    resolucion: string,
    adminId: string,
    prisma: PrismaClient,
  ) {
    if (!ESTADOS_RESOLUCION.includes(estado)) {
      throw new GraphQLError(
        "El estado de resolución debe ser RESUELTO o RECHAZADO.",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    const reporte = await reportesRepository.findById(id, prisma);
    if (!reporte) {
      throw new GraphQLError("Reporte no encontrado.", { extensions: { code: "NOT_FOUND" } });
    }
    if (reporte.estado === "RESUELTO" || reporte.estado === "RECHAZADO") {
      throw new GraphQLError("Este reporte ya fue resuelto.", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const reporteActualizado = await reportesRepository.resolver(id, estado, resolucion, adminId, prisma);

    if (estado === "RESUELTO") {
      await reportesService._aplicarAccionResolucion(reporte.tipo, reporte.referenciaId, prisma);
    }

    return reporteActualizado;
  },

  async _aplicarAccionResolucion(tipo: TipoReporte, referenciaId: string, prisma: PrismaClient) {
    if (tipo === "PRODUCTO") {
      await prisma.producto.updateMany({
        where: { id: referenciaId },
        data:  { activo: false },
      });
    } else if (tipo === "VENDEDOR") {
      await prisma.usuario.updateMany({
        where: { perfilVendedor: { id: referenciaId } },
        data:  { activo: false },
      });
    }
  },
};
