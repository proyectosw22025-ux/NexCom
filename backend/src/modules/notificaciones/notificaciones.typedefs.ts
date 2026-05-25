export const notificacionesTypeDefs = /* GraphQL */ `
  type Notificacion {
    id:       ID!
    tipo:     String!
    titulo:   String!
    mensaje:  String!
    leido:    Boolean!
    url:      String
    ordenId:  ID
    creadoEn: String!
  }

  extend type Query {
    misNotificaciones:      [Notificacion!]!
    notificacionesNoLeidas: Int!
  }

  extend type Mutation {
    marcarNotificacionLeida(id: ID!): Notificacion!
    marcarTodasLeidas:                Boolean!
  }
`;
