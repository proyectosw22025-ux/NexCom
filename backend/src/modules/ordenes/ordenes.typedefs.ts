export const ordenesTypeDefs = /* GraphQL */ `
  enum EstadoOrden {
    PENDIENTE_PAGO
    PAGADO
    EN_PREPARACION
    ENVIADO
    ENTREGADO
    COMPLETADO
    CANCELADO
  }

  type ItemOrden {
    id:             ID!
    productoId:     ID!
    nombreSnapshot: String!
    cantidad:       Int!
    precioUnitario: String!
    subtotal:       String!
  }

  type DireccionSnapshot {
    alias:        String!
    destinatario: String!
    calle:        String!
    zona:         String
    ciudad:       String!
    departamento: String!
    referencia:   String
  }

  type PagoOrden {
    id:     ID!
    monto:  String!
    moneda: String!
    metodo: String!
    estado: String!
  }

  type HistorialEstado {
    id:             ID!
    estadoAnterior: EstadoOrden
    estadoNuevo:    EstadoOrden!
    notas:          String
    creadoEn:       String!
  }

  type Orden {
    id:                    ID!
    estado:                EstadoOrden!
    subtotal:              String!
    descuentoCupon:        String!
    costoEnvio:            String!
    metodoEntrega:         String!
    total:                 String!
    notas:                 String
    direccionSnapshot:     DireccionSnapshot
    stripePaymentIntentId: String
    creadoEn:              String!
    actualizadoEn:         String!
    items:                 [ItemOrden!]!
    pago:                  PagoOrden
    historialEstados:      [HistorialEstado!]!
    compradorId:           ID!
    vendedorId:            ID!
  }

  type OrdenVendedor {
    id:                ID!
    estado:            EstadoOrden!
    subtotal:          String!
    total:             String!
    notas:             String
    direccionSnapshot: DireccionSnapshot
    creadoEn:          String!
    actualizadoEn:     String!
    items:             [ItemOrden!]!
    pago:              PagoOrden
    historialEstados:  [HistorialEstado!]!
    compradorId:       ID!
    comprador:         CompradorResumen
  }

  type CompradorResumen {
    id:             ID!
    nombreCompleto: String!
    telefono:       String
  }

  type VentaDia {
    fecha:   String!
    total:   String!
    ordenes: Int!
  }

  extend type Query {
    misOrdenes:             [Orden!]!
    miOrden(id: ID!):       Orden
    ordenesVendedor:        [OrdenVendedor!]!
    ordenVendedor(id: ID!): OrdenVendedor
    ventasVendedorPorDia(dias: Int): [VentaDia!]!
  }

  extend type Mutation {
    avanzarEstadoOrden(id: ID!, notas: String, comprobanteUrl: String): OrdenVendedor!
    marcarOrdenEntregada(id: ID!): Orden!
  }
`;
