export const configSistemaTypeDefs = /* GraphQL */ `
  type ConfigSistema {
    clave:         String!
    valor:         String!
    tipo:          String!
    descripcion:   String!
    actualizadoEn: String!
  }

  extend type Query {
    configuracionSistema:              [ConfigSistema!]!
    configuracion(clave: String!):     ConfigSistema
  }

  extend type Mutation {
    actualizarConfig(clave: String!, valor: String!): ConfigSistema!
  }
`;
