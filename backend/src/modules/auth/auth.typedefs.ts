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
    telefono:      String
    logoUrl:       String
    ratingPromedio: String!
    totalVentas:   Int!
    totalResenias: Int!
    plan:          String!
    planVenceEn:   String   # fin del periodo PRO pagado (null en FREE)
    verificado:    Boolean!
    respondeRapido: Boolean!
    disputasPerdidas: Int!    # reclamos resueltos a favor del comprador (señal de confianza)
    # KYC — solo visibles para el dueño del perfil (vía 'me'); null en tienda pública
    estadoVerificacion: String  # NO_ENVIADO | PENDIENTE | APROBADO | RECHAZADO
    verificacionNotas:  String  # motivo de rechazo
    documentoUrl:       String
    documentoTipo:      String
  }

  type VerificacionPendiente {
    id:            ID!      # perfilVendedorId
    nombreNegocio: String!
    ciudad:        String!
    email:         String!
    telefono:      String
    documentoUrl:  String
    documentoTipo: String
    enviadaEn:     String
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
    me: UsuarioPublico
    vendedorPublico(id: ID!): PerfilVendedorPublico
    verificacionesPendientes: [VerificacionPendiente!]!   # admin: cola de KYC
  }

  extend type Mutation {
    mejorarPlan(plan: String!):                                 PerfilVendedorPublico!
    verificarVendedor(vendedorId: ID!, verificado: Boolean!):   PerfilVendedorPublico!
    enviarVerificacion(documentoUrl: String!, documentoTipo: String!): PerfilVendedorPublico!
    resolverVerificacion(vendedorId: ID!, aprobar: Boolean!, notas: String): PerfilVendedorPublico!
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
