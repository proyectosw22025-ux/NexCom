export const facturasTypeDefs = /* GraphQL */ `
  type FacturaItem {
    nombre:         String!
    cantidad:       Int!
    precioUnitario: String!
    subtotal:       String!
  }

  type Factura {
    id:            ID!
    numero:        Int!
    nitComprador:  String!
    razonSocial:   String!
    importeTotal:  String!
    neto:          String!
    iva:           String!
    codigoControl: String!
    fechaEmision:  String!
    emisorNombre:  String!
    emisorCiudad:  String!
    items:         [FacturaItem!]!
  }

  extend type Query {
    facturaDeOrden(ordenId: ID!): Factura
  }

  extend type Mutation {
    solicitarFactura(ordenId: ID!, nitComprador: String!, razonSocial: String!): Factura!
  }
`;
