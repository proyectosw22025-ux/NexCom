export const busquedaTypeDefs = /* GraphQL */ `
  type ResultadoBusqueda {
    items:       [Producto!]!
    total:       Int!
    pagina:      Int!
    totalPaginas: Int!
    termino:     String!
  }

  type SugerenciaProducto {
    id:        ID!
    nombre:    String!
    precio:    String!
    imagenUrl: String
  }

  extend type Query {
    buscar(
      termino:    String!
      pagina:     Int
      limite:     Int
      categoriaId: ID
    ): ResultadoBusqueda!

    sugerenciasBusqueda(termino: String!): [SugerenciaProducto!]!
  }
`;
