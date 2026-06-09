export const adminTypeDefs = /* GraphQL */ `
  type UsuarioAdmin {
    id:             ID!
    email:          String!
    rol:            String!
    verificado:     Boolean!
    activo:         Boolean!
    creadoEn:       String!
    perfilVendedor:  PerfilVendedorAdmin
    perfilComprador: PerfilCompradorAdmin
  }

  type PerfilVendedorAdmin {
    id:             ID!
    nombreNegocio:  String!
    ciudad:         String!
    ratingPromedio: String!
    totalVentas:    Int!
    totalResenias:  Int!
  }

  type PerfilCompradorAdmin {
    id:             ID!
    nombreCompleto: String!
    telefono:       String
  }

  type PaginatedUsuarios {
    items:       [UsuarioAdmin!]!
    total:       Int!
    pagina:      Int!
    totalPaginas: Int!
  }

  extend type Query {
    listarUsuarios(rol: String, activo: Boolean, pagina: Int, limite: Int): PaginatedUsuarios!
    usuarioDetalle(id: ID!): UsuarioAdmin
  }

  extend type Mutation {
    toggleActivoUsuario(id: ID!):              UsuarioAdmin!
    cambiarRolUsuario(id: ID!, rol: String!):  UsuarioAdmin!
  }
`;
