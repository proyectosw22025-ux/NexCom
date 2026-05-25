export const direccionesTypeDefs = /* GraphQL */ `
  type Direccion {
    id:           ID!
    alias:        String!
    destinatario: String!
    calle:        String!
    zona:         String
    ciudad:       String!
    departamento: String!
    referencia:   String
    esPrincipal:  Boolean!
  }

  input CrearDireccionInput {
    alias:        String!
    destinatario: String!
    calle:        String!
    zona:         String
    ciudad:       String
    departamento: String
    referencia:   String
    esPrincipal:  Boolean
  }

  input ActualizarDireccionInput {
    alias:        String
    destinatario: String
    calle:        String
    zona:         String
    ciudad:       String
    departamento: String
    referencia:   String
  }

  extend type Query {
    misDirecciones: [Direccion!]!
  }

  extend type Mutation {
    crearDireccion(input: CrearDireccionInput!):              Direccion!
    actualizarDireccion(id: ID!, input: ActualizarDireccionInput!): Direccion!
    eliminarDireccion(id: ID!):                              Boolean!
    setPrincipal(id: ID!):                                   Direccion!
  }
`;
