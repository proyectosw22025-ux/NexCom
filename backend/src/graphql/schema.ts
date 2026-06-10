import { mergeTypeDefs } from "@graphql-tools/merge";
import { authTypeDefs }        from "../modules/auth/auth.typedefs.js";
import { categoriasTypeDefs }  from "../modules/categorias/categorias.typedefs.js";
import { etiquetasTypeDefs }   from "../modules/etiquetas/etiquetas.typedefs.js";
import { productosTypeDefs }   from "../modules/productos/productos.typedefs.js";
import { busquedaTypeDefs }    from "../modules/busqueda/busqueda.typedefs.js";
import { favoritosTypeDefs }   from "../modules/favoritos/favoritos.typedefs.js";
import { carritoTypeDefs }     from "../modules/carrito/carrito.typedefs.js";
import { ofertasTypeDefs }     from "../modules/ofertas/ofertas.typedefs.js";
import { cuponesTypeDefs }     from "../modules/cupones/cupones.typedefs.js";
import { direccionesTypeDefs } from "../modules/direcciones/direcciones.typedefs.js";
import { pagosTypeDefs }          from "../modules/pagos/pagos.typedefs.js";
import { ordenesTypeDefs }        from "../modules/ordenes/ordenes.typedefs.js";
import { valoracionesTypeDefs }   from "../modules/valoraciones/valoraciones.typedefs.js";
import { notificacionesTypeDefs } from "../modules/notificaciones/notificaciones.typedefs.js";
import { adminTypeDefs }          from "../modules/admin/admin.typedefs.js";
import { reportesTypeDefs }       from "../modules/reportes/reportes.typedefs.js";
import { configSistemaTypeDefs }  from "../modules/config-sistema/config-sistema.typedefs.js";

const baseTypeDefs = /* GraphQL */ `
  type Query {
    ping: String!
  }

  type Mutation {
    _placeholder: Boolean
  }

  type Subscription {
    _placeholder: Boolean
  }
`;

export const schema = mergeTypeDefs([
  baseTypeDefs,
  authTypeDefs,
  categoriasTypeDefs,
  etiquetasTypeDefs,
  productosTypeDefs,
  busquedaTypeDefs,
  favoritosTypeDefs,
  carritoTypeDefs,
  ofertasTypeDefs,
  cuponesTypeDefs,
  direccionesTypeDefs,
  pagosTypeDefs,
  ordenesTypeDefs,
  valoracionesTypeDefs,
  notificacionesTypeDefs,
  adminTypeDefs,
  reportesTypeDefs,
  configSistemaTypeDefs,
]);
