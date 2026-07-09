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

  extend type Query {
    miBilletera: BilleteraComprador!
  }
`;
