import { gql } from "@apollo/client";

const DEVOLUCION_FIELDS = gql`
  fragment DevolucionFields on Devolucion {
    id ordenId ordenIdCorto motivo estado montoReembolso respuestaVendedor otroNombre creadoEn
  }
`;

export const DEVOLUCION_DE_ORDEN = gql`
  ${DEVOLUCION_FIELDS}
  query DevolucionDeOrden($ordenId: ID!) {
    devolucionDeOrden(ordenId: $ordenId) { ...DevolucionFields }
  }
`;

export const DEVOLUCIONES_VENDEDOR = gql`
  ${DEVOLUCION_FIELDS}
  query DevolucionesVendedor {
    devolucionesVendedor { ...DevolucionFields }
  }
`;

export const SOLICITAR_DEVOLUCION = gql`
  ${DEVOLUCION_FIELDS}
  mutation SolicitarDevolucion($ordenId: ID!, $motivo: String!) {
    solicitarDevolucion(ordenId: $ordenId, motivo: $motivo) { ...DevolucionFields }
  }
`;

export const RESPONDER_DEVOLUCION = gql`
  ${DEVOLUCION_FIELDS}
  mutation ResponderDevolucion($id: ID!, $aprobar: Boolean!, $respuesta: String) {
    responderDevolucion(id: $id, aprobar: $aprobar, respuesta: $respuesta) { ...DevolucionFields }
  }
`;
