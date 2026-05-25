export const busquedaTypeDefs = /* GraphQL */ `
  type ResultadoBusqueda {
    items:       [Producto!]!
    total:       Int!
    pagina:      Int!
    totalPaginas: Int!
    termino:     String!
  }

  extend type Query {
    buscar(
      termino:    String!
      pagina:     Int
      limite:     Int
      categoriaId: ID
    ): ResultadoBusqueda!
  }
`;
