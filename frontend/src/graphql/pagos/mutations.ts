import { gql } from "@apollo/client";

export const CREAR_PAYMENT_INTENT = gql`
  mutation CrearPaymentIntent($direccionId: ID!, $cuponCodigo: String) {
    crearPaymentIntent(direccionId: $direccionId, cuponCodigo: $cuponCodigo) {
      clientSecret
      ordenId
    }
  }
`;

export const CREAR_ORDEN_SIMULADA = gql`
  mutation CrearOrdenSimulada(
    $direccionId: ID!, $cuponCodigo: String, $metodoPago: MetodoPagoBoliviano!,
    $metodoEntrega: String, $usarPuntos: Boolean
  ) {
    crearOrdenSimulada(
      direccionId: $direccionId, cuponCodigo: $cuponCodigo, metodoPago: $metodoPago,
      metodoEntrega: $metodoEntrega, usarPuntos: $usarPuntos
    ) {
      ordenIds
      metodoPago
      total
    }
  }
`;

export const CONFIRMAR_PAGO_SIMULADO = gql`
  mutation ConfirmarPagoSimulado($ordenIds: [ID!]!) {
    confirmarPagoSimulado(ordenIds: $ordenIds) {
      ordenIds
      estado
    }
  }
`;
