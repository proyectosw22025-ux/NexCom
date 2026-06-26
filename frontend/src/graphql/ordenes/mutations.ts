import { gql } from "@apollo/client";

export const AVANZAR_ESTADO_ORDEN = gql`
  mutation AvanzarEstadoOrden($id: ID!, $notas: String, $comprobanteUrl: String) {
    avanzarEstadoOrden(id: $id, notas: $notas, comprobanteUrl: $comprobanteUrl) {
      id estado actualizadoEn
      historialEstados { id estadoAnterior estadoNuevo notas creadoEn }
    }
  }
`;

export const MARCAR_ORDEN_ENTREGADA = gql`
  mutation MarcarOrdenEntregada($id: ID!) {
    marcarOrdenEntregada(id: $id) {
      id estado actualizadoEn fondosLiberadosEn
    }
  }
`;

export const CONFIRMAR_ENTREGA_CON_CODIGO = gql`
  mutation ConfirmarEntregaConCodigo($id: ID!, $codigo: String!) {
    confirmarEntregaConCodigo(id: $id, codigo: $codigo) {
      id estado actualizadoEn fondosLiberadosEn
    }
  }
`;
