export const devolucionesTypeDefs = /* GraphQL */ `
  enum EstadoDevolucion {
    SOLICITADA
    RECHAZADA
    REEMBOLSADA
  }

  type Devolucion {
    id:                ID!
    ordenId:           ID!
    ordenIdCorto:      String!
    motivo:            String!
    tipoProblema:      String
    evidenciaUrls:     [String!]!
    estado:            EstadoDevolucion!
    montoReembolso:    String!
    respuestaVendedor: String
    otroNombre:        String!
    creadoEn:          String!
  }

  extend type Query {
    misDevoluciones:                    [Devolucion!]!
    devolucionesVendedor:               [Devolucion!]!
    devolucionDeOrden(ordenId: ID!):    Devolucion
  }

  extend type Mutation {
    solicitarDevolucion(ordenId: ID!, motivo: String!, tipoProblema: String, evidenciaUrls: [String!]): Devolucion!
    responderDevolucion(id: ID!, aprobar: Boolean!, respuesta: String): Devolucion!
  }
`;
