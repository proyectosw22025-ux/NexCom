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

  extend type Mutation {
    crearPaymentIntent(
      direccionId:  ID!
      cuponCodigo:  String
    ): PaymentIntentResult!
  }
`;
