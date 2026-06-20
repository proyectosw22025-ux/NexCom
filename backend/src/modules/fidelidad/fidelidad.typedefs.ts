export const fidelidadTypeDefs = /* GraphQL */ `
  type PuntosBalance {
    disponibles: Int!
    valorBs:     String!
  }

  type MovimientoPuntos {
    id:           ID!
    tipo:         String!
    puntos:       Int!
    ordenIdCorto: String
    descripcion:  String!
    creadoEn:     String!
  }

  extend type Query {
    misPuntos:           PuntosBalance!
    misMovimientosPuntos: [MovimientoPuntos!]!
  }
`;
