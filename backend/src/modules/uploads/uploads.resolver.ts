import { requireAuth } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { firmarSubida } from "../../shared/cloudinary.js";

export const uploadsResolvers = {
  Mutation: {
    // Cualquier usuario autenticado puede subir imágenes: vendedores (productos),
    // compradores (evidencia de devolución/disputa) y admin. Subir a Cloudinary
    // con firma efímera no expone nada sensible.
    firmarSubidaImagen: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireAuth(ctx);
      return firmarSubida();
    },
  },
};
