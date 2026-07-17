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
    # Vista previa del contenido reportado (producto/vendedor) para que el
    # admin decida sin salir de la pantalla. Se resuelve bajo demanda.
    referencia:   ReferenciaReporte
  }

  type ReporteUsuario {
    id:    ID!
    email: String!
  }

  # Resumen del objeto reportado. usuarioId/usuarioActivo permiten banear al
  # dueño directamente desde el reporte; productoActivo refleja si la
  # publicación sigue visible.
  type ReferenciaReporte {
    tipo:           TipoReporte!
    encontrado:     Boolean!
    titulo:         String
    subtitulo:      String
    imagenUrl:      String
    usuarioId:      ID
    usuarioActivo:  Boolean
    productoActivo: Boolean
  }

  type PaginatedReportes {
    items:       [Reporte!]!
    total:       Int!
    pagina:      Int!
    totalPaginas: Int!
  }

  extend type Query {
    reportes(estado: EstadoReporte, tipo: TipoReporte, pagina: Int, limite: Int): PaginatedReportes!
    reporte(id: ID!): Reporte
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

    # Elimina definitivamente una publicación (producto) reportada. Solo procede
    # si el producto no tiene historial de ventas (no se destruye la trazabilidad
    # de órdenes); en ese caso el admin debe deshabilitarlo en su lugar.
    eliminarPublicacion(id: ID!): Boolean!
  }
`;
