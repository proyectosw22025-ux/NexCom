export const disputasTypeDefs = /* GraphQL */ `
  type Disputa {
    id:              ID!
    ordenId:         ID!
    ordenCorto:      String!
    motivo:          String!
    descripcion:     String
    evidenciaUrl:    String
    estado:          String!   # ABIERTA | RESUELTA_COMPRADOR | RESUELTA_VENDEDOR
    resolucionNota:  String
    total:           String
    compradorNombre: String
    vendedorNombre:  String
    creadoEn:        String!
    resueltoEn:      String
  }

  extend type Query {
    misDisputas:               [Disputa!]!         # comprador
    disputaDeOrden(ordenId: ID!): Disputa          # comprador
    disputasPendientes:        [Disputa!]!         # admin
    disputasResueltas:         [Disputa!]!         # admin
  }

  extend type Mutation {
    abrirDisputa(ordenId: ID!, motivo: String!, descripcion: String, evidenciaUrl: String): Disputa!  # comprador
    resolverDisputa(disputaId: ID!, aFavor: String!, nota: String): Disputa!                          # admin
  }
`;
