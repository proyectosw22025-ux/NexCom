import { gql } from "@apollo/client";

const ORDEN_FIELDS = gql`
  fragment OrdenFields on Orden {
    id
    estado
    subtotal
    descuentoCupon
    costoEnvio
    metodoEntrega
    puntoRetiro
    total
    notas
    creadoEn
    actualizadoEn
    stripePaymentIntentId
    codigoEntrega
    autoLiberaEn
    fondosLiberadosEn
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
      autoLiberaEn fondosLiberadosEn
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
      autoLiberaEn fondosLiberadosEn
      direccionSnapshot { alias destinatario calle zona ciudad departamento referencia }
      items { id productoId nombreSnapshot cantidad precioUnitario subtotal }
      pago { id monto moneda metodo estado }
      historialEstados { id estadoAnterior estadoNuevo notas creadoEn }
      comprador { id nombreCompleto telefono }
    }
  }
`;

export const VENTAS_VENDEDOR_POR_DIA = gql`
  query VentasVendedorPorDia($dias: Int) {
    ventasVendedorPorDia(dias: $dias) {
      fecha total ordenes
    }
  }
`;
