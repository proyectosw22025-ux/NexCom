import { mergeTypeDefs } from "@graphql-tools/merge";
import { authTypeDefs }        from "../modules/auth/auth.typedefs.js";
import { categoriasTypeDefs }  from "../modules/categorias/categorias.typedefs.js";
import { etiquetasTypeDefs }   from "../modules/etiquetas/etiquetas.typedefs.js";
import { productosTypeDefs }   from "../modules/productos/productos.typedefs.js";
import { preguntasTypeDefs }   from "../modules/preguntas/preguntas.typedefs.js";
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
import { mensajesTypeDefs }      from "../modules/mensajes/mensajes.typedefs.js";
import { devolucionesTypeDefs }  from "../modules/devoluciones/devoluciones.typedefs.js";
import { disputasTypeDefs }      from "../modules/disputas/disputas.typedefs.js";
import { saldosTypeDefs }        from "../modules/saldos/saldos.typedefs.js";
import { facturasTypeDefs }      from "../modules/facturas/facturas.typedefs.js";
import { uploadsTypeDefs }       from "../modules/uploads/uploads.typedefs.js";
import { fidelidadTypeDefs }     from "../modules/fidelidad/fidelidad.typedefs.js";
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
  preguntasTypeDefs,
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
  mensajesTypeDefs,
  devolucionesTypeDefs,
  disputasTypeDefs,
  saldosTypeDefs,
  facturasTypeDefs,
  uploadsTypeDefs,
  fidelidadTypeDefs,
  adminTypeDefs,
  reportesTypeDefs,
  configSistemaTypeDefs,
]);
