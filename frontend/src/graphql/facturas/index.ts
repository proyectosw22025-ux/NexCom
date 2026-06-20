import { gql } from "@apollo/client";

const FACTURA_FIELDS = gql`
  fragment FacturaFields on Factura {
    id numero nitComprador razonSocial importeTotal neto iva codigoControl fechaEmision
    emisorNombre emisorCiudad
    items { nombre cantidad precioUnitario subtotal }
  }
`;

export const FACTURA_DE_ORDEN = gql`
  ${FACTURA_FIELDS}
  query FacturaDeOrden($ordenId: ID!) {
    facturaDeOrden(ordenId: $ordenId) { ...FacturaFields }
  }
`;

export const SOLICITAR_FACTURA = gql`
  ${FACTURA_FIELDS}
  mutation SolicitarFactura($ordenId: ID!, $nitComprador: String!, $razonSocial: String!) {
    solicitarFactura(ordenId: $ordenId, nitComprador: $nitComprador, razonSocial: $razonSocial) { ...FacturaFields }
  }
`;
