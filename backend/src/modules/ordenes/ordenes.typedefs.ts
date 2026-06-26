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
    puntoRetiro:           String
    total:                 String!
    notas:                 String
    direccionSnapshot:     DireccionSnapshot
    stripePaymentIntentId: String
    # Compra Protegida — visibles para el COMPRADOR dueño de la orden
    codigoEntrega:         String   # PIN de entrega (solo el comprador lo ve)
    autoLiberaEn:          String   # fecha de auto-liberación de la garantía
    fondosLiberadosEn:     String   # null mientras los fondos siguen retenidos
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
    # El vendedor NO ve el código de entrega; sí la ventana/estado de la garantía
    autoLiberaEn:      String
    fondosLiberadosEn: String
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
    # Handshake de entrega: el vendedor ingresa el código que el comprador le muestra
    confirmarEntregaConCodigo(id: ID!, codigo: String!): OrdenVendedor!
  }
`;
