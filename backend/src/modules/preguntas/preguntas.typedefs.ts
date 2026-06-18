export const preguntasTypeDefs = /* GraphQL */ `
  type PreguntaProducto {
    id:           ID!
    productoId:   ID!
    pregunta:     String!
    respuesta:    String
    respondidoEn: String
    creadoEn:     String!
    autor:        String!
  }

  extend type Query {
    preguntasProducto(productoId: ID!): [PreguntaProducto!]!
  }

  extend type Mutation {
    crearPregunta(productoId: ID!, pregunta: String!):        PreguntaProducto!
    responderPregunta(preguntaId: ID!, respuesta: String!):  PreguntaProducto!
  }
`;
