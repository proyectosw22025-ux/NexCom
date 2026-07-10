export const uploadsTypeDefs = /* GraphQL */ `
  type SubidaFirmada {
    cloudName: String!
    apiKey:    String!
    timestamp: Int!
    folder:    String!
    signature: String!
    tipo:      String   # "authenticated" para subidas privadas (KYC)
  }

  extend type Mutation {
    # Devuelve una firma para subir UNA imagen directo a Cloudinary (sin exponer el secret)
    firmarSubidaImagen: SubidaFirmada!
    # Firma para subir el documento KYC como privado (type: authenticated)
    firmarSubidaKyc: SubidaFirmada!
  }
`;
