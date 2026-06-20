export const saldosTypeDefs = /* GraphQL */ `
  type Saldo {
    disponible:    String!
    generado:      String!
    enRevision:    String!
    retirado:      String!
    comisionTotal: String!
  }

  type MovimientoSaldo {
    id:           ID!
    tipo:         String!
    monto:        String!
    comision:     String!
    ordenIdCorto: String
    descripcion:  String!
    creadoEn:     String!
  }

  type SolicitudRetiro {
    id:             ID!
    monto:          String!
    estado:         String!
    banco:          String!
    numeroCuenta:   String!
    titular:        String!
    notaAdmin:      String
    vendedorNombre: String
    creadoEn:       String!
    resueltoEn:     String
  }

  extend type Query {
    miSaldo:              Saldo!
    misMovimientos:       [MovimientoSaldo!]!
    misRetiros:           [SolicitudRetiro!]!
    retirosPendientes:    [SolicitudRetiro!]!   # admin
    retirosResueltos:     [SolicitudRetiro!]!   # admin
  }

  extend type Mutation {
    solicitarRetiro(monto: String!, banco: String!, numeroCuenta: String!, titular: String!): SolicitudRetiro!
    resolverRetiro(id: ID!, aprobar: Boolean!, nota: String): SolicitudRetiro!  # admin
  }
`;
