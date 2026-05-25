export const valoracionesTypeDefs = /* GraphQL */ `
  type RespuestaValoracion {
    id:        ID!
    respuesta: String!
    creadoEn:  String!
  }

  type Valoracion {
    id:           ID!
    ordenId:      ID!
    compradorId:  ID!
    vendedorId:   ID!
    calificacion: Int!
    comentario:   String
    creadoEn:     String!
    respuesta:    RespuestaValoracion
  }

  input CrearValoracionInput {
    ordenId:      ID!
    calificacion: Int!
    comentario:   String
  }

  extend type Query {
    misValoraciones:                          [Valoracion!]!
    valoracionesDeVendedor(vendedorId: ID!):  [Valoracion!]!
    valoracionesRecibidas:                    [Valoracion!]!
  }

  extend type Mutation {
    crearValoracion(input: CrearValoracionInput!):              Valoracion!
    responderValoracion(valoracionId: ID!, respuesta: String!): Valoracion!
  }
`;
