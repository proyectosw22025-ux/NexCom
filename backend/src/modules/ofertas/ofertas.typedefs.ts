export const ofertasTypeDefs = /* GraphQL */ `
  enum EstadoOferta {
    PROGRAMADA
    ACTIVA
    VENCIDA
    CANCELADA
  }

  type OfertaProductoItem {
    id:     ID!
    nombre: String!
    precio: String!
  }

  type Oferta {
    id:          ID!
    titulo:      String!
    descripcion: String
    descuento:   String!
    fechaInicio: String!
    fechaFin:    String!
    estado:      EstadoOferta!
    creadoEn:    String!
    productos:   [OfertaProductoItem!]!
  }

  input CrearOfertaInput {
    titulo:      String!
    descripcion: String
    descuento:   Float!
    fechaInicio: String!
    fechaFin:    String!
    productoIds: [ID!]!
  }

  input ActualizarOfertaInput {
    titulo:      String
    descripcion: String
    descuento:   Float
    fechaFin:    String
    productoIds: [ID!]
  }

  extend type Query {
    ofertasActivas: [Oferta!]!
    misOfertas:     [Oferta!]!
  }

  extend type Mutation {
    crearOferta(input: CrearOfertaInput!):                    Oferta!
    actualizarOferta(id: ID!, input: ActualizarOfertaInput!): Oferta!
    cancelarOferta(id: ID!):                                  Oferta!
  }
`;
