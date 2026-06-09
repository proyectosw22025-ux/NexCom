export const reportesTypeDefs = /* GraphQL */ `
  enum EstadoReporte {
    PENDIENTE
    REVISANDO
    RESUELTO
    RECHAZADO
  }

  enum TipoReporte {
    PRODUCTO
    VENDEDOR
    VALORACION
    OFERTA
    MENSAJE
  }

  type Reporte {
    id:           ID!
    tipo:         TipoReporte!
    referenciaId: ID!
    motivo:       String!
    descripcion:  String
    estado:       EstadoReporte!
    resolucion:   String
    creadoEn:     String!
    resueltoEn:   String
    reportador:   ReporteUsuario!
    resueltoPor:  ReporteUsuario
  }

  type ReporteUsuario {
    id:    ID!
    email: String!
  }

  type PaginatedReportes {
    items:       [Reporte!]!
    total:       Int!
    pagina:      Int!
    totalPaginas: Int!
  }

  extend type Query {
    reportes(estado: EstadoReporte, tipo: TipoReporte, pagina: Int, limite: Int): PaginatedReportes!
  }

  extend type Mutation {
    crearReporte(
      tipo:         TipoReporte!
      referenciaId: ID!
      motivo:       String!
      descripcion:  String
    ): Reporte!

    resolverReporte(
      id:         ID!
      estado:     EstadoReporte!
      resolucion: String!
    ): Reporte!
  }
`;
