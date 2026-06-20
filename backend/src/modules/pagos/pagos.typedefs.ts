export const pagosTypeDefs = /* GraphQL */ `
  type PaymentIntentResult {
    clientSecret: String!
    ordenId:      ID!
  }

  type OrdenResumen {
    id:            ID!
    estado:        String!
    total:         String!
    subtotal:      String!
    descuentoCupon: String!
    creadoEn:      String!
  }

  enum MetodoPagoBoliviano {
    qr
    transferencia
    contra_entrega
  }

  type OrdenSimuladaResult {
    ordenIds:   [ID!]!
    metodoPago: String!
    total:      String!
  }

  type ConfirmacionPagoResult {
    ordenIds: [ID!]!
    estado:   String!
  }

  extend type Mutation {
    crearPaymentIntent(
      direccionId:  ID!
      cuponCodigo:  String
    ): PaymentIntentResult!

    # Flujo boliviano simulado
    crearOrdenSimulada(
      direccionId:   ID!
      cuponCodigo:   String
      metodoPago:    MetodoPagoBoliviano!
      metodoEntrega: String
      usarPuntos:    Boolean
    ): OrdenSimuladaResult!

    confirmarPagoSimulado(ordenIds: [ID!]!): ConfirmacionPagoResult!
  }
`;
