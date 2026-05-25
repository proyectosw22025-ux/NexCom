export const favoritosTypeDefs = /* GraphQL */ `
  type Favorito {
    id:        ID!
    producto:  Producto!
    creadoEn:  String!
  }

  extend type Query {
    misFavoritos:                  [Favorito!]!
    esFavorito(productoId: ID!):   Boolean!
  }

  extend type Mutation {
    toggleFavorito(productoId: ID!): Boolean!
  }
`;
