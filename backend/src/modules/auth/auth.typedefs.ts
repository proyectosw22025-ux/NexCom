export const authTypeDefs = /* GraphQL */ `
  enum Rol {
    ADMIN
    VENDEDOR
    COMPRADOR
  }

  type PerfilVendedorPublico {
    id:            ID!
    nombreNegocio: String!
    descripcion:   String
    ciudad:        String!
    logoUrl:       String
    ratingPromedio: String!
    totalVentas:   Int!
  }

  type PerfilCompradorPublico {
    id:             ID!
    nombreCompleto: String!
    telefono:       String
  }

  type UsuarioPublico {
    id:              ID!
    email:           String!
    rol:             Rol!
    verificado:      Boolean!
    activo:          Boolean!
    creadoEn:        String!
    perfilVendedor:  PerfilVendedorPublico
    perfilComprador: PerfilCompradorPublico
  }

  type AuthPayload {
    accessToken:  String!
    refreshToken: String!
    usuario:      UsuarioPublico!
  }

  input DatosVendedorInput {
    nombreNegocio: String!
    descripcion:   String
    telefono:      String
    ciudad:        String
  }

  input DatosCompradorInput {
    nombreCompleto: String!
    telefono:       String
  }

  input RegisterInput {
    email:          String!
    password:       String!
    rol:            Rol!
    datosVendedor:  DatosVendedorInput
    datosComprador: DatosCompradorInput
  }

  extend type Query {
    me:              UsuarioPublico
    listarUsuarios:  [UsuarioPublico!]!
  }

  extend type Mutation {
    register(input: RegisterInput!):                            AuthPayload!
    login(email: String!, password: String!):                  AuthPayload!
    logout(refreshToken: String):                               Boolean!
    refreshToken(token: String!):                              AuthPayload!
    verifyEmail(token: String!):                               Boolean!
    requestPasswordReset(email: String!):                      Boolean!
    resetPassword(token: String!, nuevaPassword: String!):     Boolean!
    updatePassword(passwordActual: String!, nuevaPassword: String!): Boolean!
  }
`;
