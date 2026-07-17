import { GraphQLError } from "graphql";
import type { PrismaClient, EstadoReporte, TipoReporte } from "@prisma/client";
import { reportesRepository } from "./reportes.repository.js";
import { publishNotificacion } from "../../shared/pubsub.js";

const ESTADOS_RESOLUCION: EstadoReporte[] = ["RESUELTO", "RECHAZADO"];

const TIPO_LABEL: Record<TipoReporte, string> = {
  PRODUCTO:   "un producto",
  VENDEDOR:   "un vendedor",
  VALORACION: "una valoración",
  OFERTA:     "una oferta",
  MENSAJE:    "un mensaje",
};

export const reportesService = {
  async crearReporte(
    userId: string,
    tipo: TipoReporte,
    referenciaId: string,
    motivo: string,
    descripcion: string | undefined,
    prisma: PrismaClient,
  ) {
    const reporte = await reportesRepository.create(
      { reportadorId: userId, tipo, referenciaId, motivo, descripcion },
      prisma,
    );

    // Aviso en tiempo real a los admins (best-effort: si algo falla, el reporte
    // igual queda creado y visible en la cola de moderación).
    try {
      await reportesService._notificarAdmins(tipo, motivo, prisma);
    } catch (err) {
      console.warn("[reportes] no se pudo notificar a admins:", (err as Error).message);
    }

    return reporte;
  },

  async _notificarAdmins(tipo: TipoReporte, motivo: string, prisma: PrismaClient) {
    const admins = await prisma.usuario.findMany({
      where:  { rol: "ADMIN", activo: true },
      select: { id: true },
    });
    for (const admin of admins) {
      const notif = await prisma.notificacion.create({
        data: {
          usuarioId: admin.id,
          tipo:      "REPORTE_NUEVO",
          titulo:    "Nuevo reporte de moderación",
          mensaje:   `Se reportó ${TIPO_LABEL[tipo]}: "${motivo}".`,
          url:       "/admin/reportes",
        },
      });
      publishNotificacion(admin.id, {
        id:       notif.id,
        tipo:     notif.tipo,
        titulo:   notif.titulo,
        mensaje:  notif.mensaje,
        leido:    notif.leido,
        url:      notif.url,
        ordenId:  notif.ordenId,
        creadoEn: notif.creadoEn.toISOString(),
      });
    }
  },

  async getReportes(
    { estado, tipo, pagina = 1, limite = 20 }: { estado?: EstadoReporte; tipo?: TipoReporte; pagina?: number; limite?: number },
    prisma: PrismaClient,
  ) {
    return reportesRepository.findAll({ estado, tipo }, pagina, Math.min(limite, 100), prisma);
  },

  async getReporte(id: string, prisma: PrismaClient) {
    return reportesRepository.findById(id, prisma);
  },

  /** Resumen del contenido reportado (para la vista de moderación). */
  async getReferencia(tipo: TipoReporte, referenciaId: string, prisma: PrismaClient) {
    if (tipo === "PRODUCTO") {
      const p = await prisma.producto.findUnique({
        where:   { id: referenciaId },
        include: { imagenes: { orderBy: { orden: "asc" }, take: 1 }, vendedor: { include: { usuario: true } } },
      });
      if (!p) return { tipo, encontrado: false };
      return {
        tipo,
        encontrado:     true,
        titulo:         p.nombre,
        subtitulo:      `${p.vendedor.nombreNegocio} · Bs. ${p.precio.toString()}`,
        imagenUrl:      p.imagenes[0]?.url ?? null,
        usuarioId:      p.vendedor.usuarioId,
        usuarioActivo:  p.vendedor.usuario.activo,
        productoActivo: p.activo,
      };
    }
    if (tipo === "VENDEDOR") {
      const v = await prisma.perfilVendedor.findUnique({
        where:   { id: referenciaId },
        include: { usuario: true },
      });
      if (!v) return { tipo, encontrado: false };
      return {
        tipo,
        encontrado:    true,
        titulo:        v.nombreNegocio,
        subtitulo:     v.usuario.email,
        imagenUrl:     v.logoUrl,
        usuarioId:     v.usuarioId,
        usuarioActivo: v.usuario.activo,
      };
    }
    // Otros tipos: sin vista previa enriquecida por ahora.
    return { tipo, encontrado: false };
  },

  /** Elimina definitivamente un producto reportado (si no tiene ventas). */
  async eliminarPublicacion(productoId: string, prisma: PrismaClient) {
    const producto = await prisma.producto.findUnique({
      where:   { id: productoId },
      include: { _count: { select: { itemsOrden: true } } },
    });
    if (!producto) {
      throw new GraphQLError("Producto no encontrado.", { extensions: { code: "NOT_FOUND" } });
    }
    if (producto._count.itemsOrden > 0) {
      throw new GraphQLError(
        "Este producto tiene historial de ventas y no puede eliminarse (se perdería la trazabilidad de órdenes). Deshabilítalo en su lugar.",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }
    // Borra primero las referencias sin cascada (carrito, ofertas); las imágenes,
    // etiquetas, favoritos y guardados caen por onDelete: Cascade.
    await prisma.$transaction([
      prisma.itemCarrito.deleteMany({ where: { productoId } }),
      prisma.ofertaProducto.deleteMany({ where: { productoId } }),
      prisma.producto.delete({ where: { id: productoId } }),
    ]);
    return true;
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
