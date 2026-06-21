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
    verificado:     Boolean!
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

  # Reutiliza el tipo VentaDia definido en el módulo de ordenes
  type EstadisticasAdmin {
    ventasPorDia:       [VentaDia!]!
    reportesPendientes: Int!
    ingresosPeriodo:    String!
    ordenesPeriodo:     Int!
    comisionPorcentaje: Float!
    comisionPeriodo:    String!
  }

  type MetricaOperacion {
    operacion:  String!
    count:      Int!
    errores:    Int!
    promedioMs: Int!
    p50:        Int!
    p95:        Int!
    p99:        Int!
  }

  type MetricasRendimiento {
    uptimeSegundos: Int!
    operaciones:    [MetricaOperacion!]!
  }

  # ── Analítica avanzada ──────────────────────────────────────────────
  type KpiDelta {
    valor: String!   # valor del periodo actual (numérico como texto)
    delta: Float!    # % de cambio vs periodo anterior (puede ser negativo)
  }

  type SerieDiaAnalitica {
    fecha:    String!
    ingresos: Float!
    ordenes:  Int!
  }

  type SegmentoAnalitica {
    etiqueta: String!
    valor:    Int!     # conteo
    monto:    String!  # Bs.
  }

  type TopVendedorAnalitica {
    nombreNegocio: String!
    ingresos:      String!
    ventas:        Int!
    rating:        String!
  }

  type AnaliticaAdmin {
    ingresos:        KpiDelta!
    ordenes:         KpiDelta!
    ticketPromedio:  KpiDelta!
    comision:        KpiDelta!
    usuariosNuevos:  KpiDelta!
    serie:           [SerieDiaAnalitica!]!
    porMetodoPago:   [SegmentoAnalitica!]!
    porEstado:       [SegmentoAnalitica!]!
    porCiudad:       [SegmentoAnalitica!]!
    topVendedores:   [TopVendedorAnalitica!]!
  }

  extend type Query {
    listarUsuarios(rol: String, activo: Boolean, pagina: Int, limite: Int): PaginatedUsuarios!
    usuarioDetalle(id: ID!): UsuarioAdmin
    estadisticasAdmin(dias: Int): EstadisticasAdmin!
    analiticaAdmin(dias: Int): AnaliticaAdmin!
    metricasRendimiento: MetricasRendimiento!
  }

  extend type Mutation {
    toggleActivoUsuario(id: ID!):              UsuarioAdmin!
    cambiarRolUsuario(id: ID!, rol: String!):  UsuarioAdmin!
  }
`;
