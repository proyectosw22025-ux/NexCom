export const uploadsTypeDefs = /* GraphQL */ `
  type SubidaFirmada {
    cloudName: String!
    apiKey:    String!
    timestamp: Int!
    folder:    String!
    signature: String!
  }

  extend type Mutation {
    # Devuelve una firma para subir UNA imagen directo a Cloudinary (sin exponer el secret)
    firmarSubidaImagen: SubidaFirmada!
  }
`;
