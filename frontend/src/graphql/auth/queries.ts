import { gql } from "@apollo/client";

export const ME = gql`
  query Me {
    me {
      id
      email
      rol
      verificado
      activo
      creadoEn
      perfilVendedor {
        id
        nombreNegocio
        descripcion
        ciudad
        logoUrl
        ratingPromedio
        totalVentas
        verificado
        disputasPerdidas
        plan
        planVenceEn
        estadoVerificacion
        verificacionNotas
        documentoUrl
        documentoTipo
      }
      perfilComprador {
        id
        nombreCompleto
        telefono
      }
    }
  }
`;
