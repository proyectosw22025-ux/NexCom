import { requireRole } from "../../shared/guards.js";
import type { NexComContext } from "../../shared/types/context.type.js";
import { firmarSubida } from "../../shared/cloudinary.js";

export const uploadsResolvers = {
  Mutation: {
    // Solo vendedores y admin suben imágenes (de productos)
    firmarSubidaImagen: (_: unknown, __: unknown, ctx: NexComContext) => {
      requireRole(ctx, "VENDEDOR", "ADMIN");
      return firmarSubida();
    },
  },
};
