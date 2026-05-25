import { mergeResolvers } from "@graphql-tools/merge";
import type { NexComContext } from "../shared/types/context.type.js";
import { authResolvers }        from "../modules/auth/auth.resolver.js";
import { categoriasResolvers }  from "../modules/categorias/categorias.resolver.js";
import { etiquetasResolvers }   from "../modules/etiquetas/etiquetas.resolver.js";
import { productosResolvers }   from "../modules/productos/productos.resolver.js";
import { busquedaResolvers }    from "../modules/busqueda/busqueda.resolver.js";
import { favoritosResolvers }   from "../modules/favoritos/favoritos.resolver.js";
import { carritoResolvers }     from "../modules/carrito/carrito.resolver.js";
import { ofertasResolvers }     from "../modules/ofertas/ofertas.resolver.js";
import { cuponesResolvers }     from "../modules/cupones/cupones.resolver.js";
import { direccionesResolvers } from "../modules/direcciones/direcciones.resolver.js";
import { pagosResolvers }          from "../modules/pagos/pagos.resolver.js";
import { ordenesResolvers }        from "../modules/ordenes/ordenes.resolver.js";
import { valoracionesResolvers }   from "../modules/valoraciones/valoraciones.resolver.js";
import { notificacionesResolvers } from "../modules/notificaciones/notificaciones.resolver.js";

const baseResolvers = {
  Query: {
    ping: (_: unknown, __: unknown, ctx: NexComContext) => {
      const usuario = ctx.user
        ? `Usuario: ${ctx.user.id} | Rol: ${ctx.user.rol}`
        : "Sin autenticar";
      return `pong — ${new Date().toISOString()} | ${usuario}`;
    },
  },
};

export const resolvers = mergeResolvers([
  baseResolvers,
  authResolvers,
  categoriasResolvers,
  etiquetasResolvers,
  productosResolvers,
  busquedaResolvers,
  favoritosResolvers,
  carritoResolvers,
  ofertasResolvers,
  cuponesResolvers,
  direccionesResolvers,
  pagosResolvers,
  ordenesResolvers,
  valoracionesResolvers,
  notificacionesResolvers,
]);
