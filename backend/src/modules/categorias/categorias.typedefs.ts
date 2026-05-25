export const categoriasTypeDefs = /* GraphQL */ `
  type Categoria {
    id:     ID!
    nombre: String!
    slug:   String!
    icono:  String
    orden:  Int!
    activo: Boolean!
    padre:  Categoria
    hijos:  [Categoria!]!
  }

  input CategoriaInput {
    nombre:  String!
    slug:    String!
    icono:   String
    padreId: ID
    orden:   Int
  }

  extend type Query {
    categorias(soloRaices: Boolean): [Categoria!]!
    categoria(slug: String!):        Categoria
  }

  extend type Mutation {
    crearCategoria(input: CategoriaInput!):          Categoria!
    actualizarCategoria(id: ID!, input: CategoriaInput!): Categoria!
  }
`;
