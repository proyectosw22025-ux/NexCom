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
    # Compra Protegida (lado comprador)
    codigoEntrega:         String   # SIEMPRE null: el código vive en el QR físico del paquete (posesión = prueba)
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
    # El VENDEDOR sí ve el código: genera la etiqueta QR y la empaca con el producto
    codigoEntrega:     String
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

  # Sesión de recojo: OTP temporal (2º factor) para el escaneo del QR del paquete
  type SesionRecojo {
    otp:      String!
    expiraEn: String!
  }

  extend type Mutation {
    avanzarEstadoOrden(id: ID!, notas: String, comprobanteUrl: String): OrdenVendedor!
    # Respaldo sin cámara: el comprador confirma manualmente la recepción
    marcarOrdenEntregada(id: ID!): Orden!
    # Recojo con escaneo (flujo principal): iniciar sesión OTP → escanear QR del paquete
    iniciarRecojo(id: ID!): SesionRecojo!
    confirmarRecojo(id: ID!, codigoQr: String!, otp: String!): Orden!
  }
`;
