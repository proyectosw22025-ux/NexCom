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

export const INICIAR_RECOJO = gql`
  mutation IniciarRecojo($id: ID!) {
    iniciarRecojo(id: $id) {
      otp
      expiraEn
    }
  }
`;

export const CONFIRMAR_RECOJO = gql`
  mutation ConfirmarRecojo($id: ID!, $codigoQr: String!, $otp: String!) {
    confirmarRecojo(id: $id, codigoQr: $codigoQr, otp: $otp) {
      id estado actualizadoEn fondosLiberadosEn
    }
  }
`;
