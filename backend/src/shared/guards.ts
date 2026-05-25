import { GraphQLError } from "graphql";
import type { NexComContext } from "./types/context.type.js";
import type { UsuarioJWT } from "./types/context.type.js";

export function requireAuth(ctx: NexComContext): UsuarioJWT {
  if (!ctx.user) {
    throw new GraphQLError("No autenticado. Debes iniciar sesión.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.user;
}

export function requireRole(
  ctx: NexComContext,
  ...roles: Array<"ADMIN" | "VENDEDOR" | "COMPRADOR">
): UsuarioJWT {
  const user = requireAuth(ctx);
  if (!roles.includes(user.rol)) {
    throw new GraphQLError(
      `Acceso denegado. Se requiere rol: ${roles.join(" o ")}.`,
      { extensions: { code: "FORBIDDEN" } }
    );
  }
  return user;
}
