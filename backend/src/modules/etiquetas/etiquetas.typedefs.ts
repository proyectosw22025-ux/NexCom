export const etiquetasTypeDefs = /* GraphQL */ `
  type Etiqueta {
    id:     ID!
    nombre: String!
    slug:   String!
  }

  extend type Query {
    etiquetas: [Etiqueta!]!
  }

  extend type Mutation {
    crearEtiqueta(nombre: String!): Etiqueta!
  }
`;
