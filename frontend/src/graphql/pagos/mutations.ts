import { gql } from "@apollo/client";

export const CREAR_PAYMENT_INTENT = gql`
  mutation CrearPaymentIntent($direccionId: ID!, $cuponCodigo: String) {
    crearPaymentIntent(direccionId: $direccionId, cuponCodigo: $cuponCodigo) {
      clientSecret
      ordenId
    }
  }
`;
