import { gql } from "@apollo/client";

const ORDEN_FIELDS = gql`
  fragment OrdenFields on Orden {
    id
    estado
    subtotal
    descuentoCupon
    total
    notas
    creadoEn
    actualizadoEn
    stripePaymentIntentId
    direccionSnapshot {
      alias destinatario calle zona ciudad departamento referencia
    }
    items {
      id productoId nombreSnapshot cantidad precioUnitario subtotal
    }
    pago { id monto moneda metodo estado }
    historialEstados { id estadoAnterior estadoNuevo notas creadoEn }
  }
`;

export const MIS_ORDENES = gql`
  ${ORDEN_FIELDS}
  query MisOrdenes {
    misOrdenes { ...OrdenFields }
  }
`;

export const MI_ORDEN = gql`
  ${ORDEN_FIELDS}
  query MiOrden($id: ID!) {
    miOrden(id: $id) { ...OrdenFields }
  }
`;

export const ORDENES_VENDEDOR = gql`
  query OrdenesVendedor {
    ordenesVendedor {
      id estado subtotal total notas creadoEn actualizadoEn compradorId
      direccionSnapshot { alias destinatario calle zona ciudad departamento referencia }
      items { id productoId nombreSnapshot cantidad precioUnitario subtotal }
      pago { id monto moneda metodo estado }
      historialEstados { id estadoAnterior estadoNuevo notas creadoEn }
      comprador { id nombreCompleto telefono }
    }
  }
`;

export const ORDEN_VENDEDOR = gql`
  query OrdenVendedor($id: ID!) {
    ordenVendedor(id: $id) {
      id estado subtotal total notas creadoEn actualizadoEn compradorId
      direccionSnapshot { alias destinatario calle zona ciudad departamento referencia }
      items { id productoId nombreSnapshot cantidad precioUnitario subtotal }
      pago { id monto moneda metodo estado }
      historialEstados { id estadoAnterior estadoNuevo notas creadoEn }
      comprador { id nombreCompleto telefono }
    }
  }
`;
