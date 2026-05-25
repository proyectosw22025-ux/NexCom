import { gql } from "@apollo/client";

export const MIS_DIRECCIONES = gql`
  query MisDirecciones {
    misDirecciones {
      id
      alias
      destinatario
      calle
      zona
      ciudad
      departamento
      referencia
      esPrincipal
    }
  }
`;
