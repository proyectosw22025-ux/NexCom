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

  # Ganancia de la plataforma por tienda (comisión real cobrada, desde el ledger)
  type ComisionVendedor {
    nombre:   String!
    ventas:   Int!
    bruto:    String!  # ventas brutas acreditadas (neto + comisión)
    comision: String!  # lo que ganó la plataforma con esta tienda
    tasa:     Float!   # % efectivo (comisión / bruto)
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
    comisionPorVendedor: [ComisionVendedor!]!
  }

  # ── Reporte: Productos & Inventario ──────────────────────────────────
  type TopProducto {
    nombre:   String!
    vendedor: String!
    unidades: Int!
    ingresos: String!
  }
  type SaludInventario {
    enStock: Int!
    bajo:    Int!
    agotado: Int!
  }
  type AnaliticaProductos {
    unidades:         KpiDelta!
    ingresos:         KpiDelta!
    productosActivos: Int!
    sinVentas:        Int!
    inventario:       SaludInventario!
    topProductos:     [TopProducto!]!
    porCategoria:     [SegmentoAnalitica!]!
  }

  # ── Reporte: Clientes & Retención ────────────────────────────────────
  type FrecuenciaCompra {
    f1: Int!
    f2: Int!
    f3: Int!
    f4: Int!
  }
  type TopCliente {
    nombre:  String!
    ordenes: Int!
    gasto:   String!
    ticket:  String!
  }
  type AnaliticaClientes {
    clientesActivos: KpiDelta!
    ticketPromedio:  KpiDelta!
    nuevos:          Int!
    recurrentes:     Int!
    frecuencia:      FrecuenciaCompra!
    topClientes:     [TopCliente!]!
  }

  # ── Auditoría de seguridad ───────────────────────────────────────────
  type EventoSeguridad {
    id:        ID!
    tipo:      String!
    usuarioId: String
    ordenId:   String
    metadata:  String   # JSON serializado
    creadoEn:  String!
  }

  # ── Riesgo / antifraude ──────────────────────────────────────────────
  type RiesgoVendedor {
    vendedorId: ID!
    nombre:     String!
    verificado: Boolean!
    ordenes:    Int!
    cancelados: Int!
    disputas:   Int!
    score:      Int!
    nivel:      String!   # BAJO | MEDIO | ALTO
    factores:   [String!]!
  }

  extend type Query {
    listarUsuarios(rol: String, activo: Boolean, pagina: Int, limite: Int): PaginatedUsuarios!
    usuarioDetalle(id: ID!): UsuarioAdmin
    estadisticasAdmin(dias: Int): EstadisticasAdmin!
    # Periodo: preset (dias) o rango personalizado (desde/hasta, YYYY-MM-DD, ambos)
    analiticaAdmin(dias: Int, desde: String, hasta: String): AnaliticaAdmin!
    analiticaProductos(dias: Int, desde: String, hasta: String): AnaliticaProductos!
    analiticaClientes(dias: Int, desde: String, hasta: String): AnaliticaClientes!
    eventosSeguridad(tipo: String, limite: Int): [EventoSeguridad!]!
    riesgoVendedores: [RiesgoVendedor!]!
    metricasRendimiento: MetricasRendimiento!
  }

  extend type Mutation {
    toggleActivoUsuario(id: ID!):              UsuarioAdmin!
    cambiarRolUsuario(id: ID!, rol: String!):  UsuarioAdmin!
  }
`;
