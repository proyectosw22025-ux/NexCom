import { requireAuth, requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { firmarSubida, firmarSubidaKyc } from "../../shared/cloudinary.js";

export const uploadsResolvers = {
  Mutation: {
    // Cualquier usuario autenticado puede subir imágenes: vendedores (productos),
    // compradores (evidencia de devolución/disputa) y admin. Subir a Cloudinary
    // con firma efímera no expone nada sensible.
    firmarSubidaImagen: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireAuth(ctx);
      return firmarSubida();
    },

    // Documento KYC: subida PRIVADA (authenticated). Solo el vendedor.
    firmarSubidaKyc: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR");
      return firmarSubidaKyc();
    },
  },
};
