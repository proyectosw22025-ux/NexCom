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
    ordenId:    ID!
    metodoPago: String!
    total:      String!
  }

  type ConfirmacionPagoResult {
    ordenId: ID!
    estado:  String!
    metodo:  String!
  }

  extend type Mutation {
    crearPaymentIntent(
      direccionId:  ID!
      cuponCodigo:  String
    ): PaymentIntentResult!

    # Flujo boliviano simulado
    crearOrdenSimulada(
      direccionId: ID!
      cuponCodigo: String
      metodoPago:  MetodoPagoBoliviano!
    ): OrdenSimuladaResult!

    confirmarPagoSimulado(ordenId: ID!): ConfirmacionPagoResult!
  }
`;
