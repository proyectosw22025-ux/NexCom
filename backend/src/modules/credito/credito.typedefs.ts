export const creditoTypeDefs = /* GraphQL */ `
  type MovimientoCredito {
    id:          ID!
    tipo:        String!    # REEMBOLSO | USO | RETIRO
    monto:       String!
    ordenId:     ID
    descripcion: String
    creadoEn:    String!
  }

  type BilleteraComprador {
    disponible:  String!
    movimientos: [MovimientoCredito!]!
  }

  type RetiroCredito {
    id:           ID!
    monto:        String!
    estado:       String!   # PENDIENTE | PAGADO | RECHAZADO
    banco:        String!
    numeroCuenta: String!
    titular:      String!
    notaAdmin:    String
    creadoEn:     String!
    resueltoEn:   String
  }

  type RetiroCreditoAdmin {
    id:              ID!
    monto:           String!
    estado:          String!
    banco:           String!
    numeroCuenta:    String!
    titular:         String!
    compradorNombre: String!
    compradorEmail:  String!
    creadoEn:        String!
  }

  input SolicitarRetiroCreditoInput {
    monto:        String!
    banco:        String!
    numeroCuenta: String!
    titular:      String!
  }

  extend type Query {
    miBilletera: BilleteraComprador!
    misRetirosCredito: [RetiroCredito!]!
    retirosCreditoPendientes: [RetiroCreditoAdmin!]!   # admin
  }

  extend type Mutation {
    solicitarRetiroCredito(input: SolicitarRetiroCreditoInput!): RetiroCredito!
    resolverRetiroCredito(id: ID!, aprobar: Boolean!, nota: String): RetiroCredito!  # admin
  }
`;
