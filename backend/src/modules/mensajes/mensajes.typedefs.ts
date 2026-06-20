export const mensajesTypeDefs = /* GraphQL */ `
  type ConversacionResumen {
    id:            ID!
    productoId:    ID
    otroNombre:    String!
    ultimoMensaje: String
    actualizadoEn: String!
    noLeidos:      Int!
  }

  type Mensaje {
    id:        ID!
    contenido: String!
    esMio:     Boolean!
    leido:     Boolean!
    creadoEn:  String!
  }

  extend type Query {
    misConversaciones:                        [ConversacionResumen!]!
    mensajesConversacion(conversacionId: ID!): [Mensaje!]!
  }

  extend type Mutation {
    iniciarConversacion(vendedorId: ID!, productoId: ID): ID!
    enviarMensaje(conversacionId: ID!, contenido: String!): Mensaje!
  }
`;
