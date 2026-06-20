export const cuponesTypeDefs = /* GraphQL */ `
  type Cupon {
    id:           ID!
    codigo:       String!
    tipo:         String!
    valor:        String!
    montoMinimo:  String
    maxUsos:      Int
    usosActuales: Int!
    vendedorId:   ID
    fechaInicio:  String!
    fechaFin:     String!
    activo:       Boolean!
    creadoEn:     String!
  }

  type CuponValidado {
    cuponId:       ID!
    codigo:        String!
    tipo:          String!
    valor:         String!
    descuento:     String!
    totalConDescuento: String!
  }

  input CrearCuponInput {
    codigo:      String!
    tipo:        String!
    valor:       Float!
    montoMinimo: Float
    maxUsos:     Int
    fechaInicio: String!
    fechaFin:    String!
  }

  extend type Query {
    cupones: [Cupon!]!
    misCupones: [Cupon!]!
  }

  extend type Mutation {
    crearCupon(input: CrearCuponInput!):                     Cupon!
    desactivarCupon(id: ID!):                                Cupon!
    validarCupon(codigo: String!, subtotal: String!): CuponValidado!
  }
`;
