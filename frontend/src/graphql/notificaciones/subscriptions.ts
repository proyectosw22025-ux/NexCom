import { gql } from "@apollo/client";

export const NOTIFICACION_CREADA = gql`
  subscription NotificacionCreada {
    notificacionCreada {
      id tipo titulo mensaje leido url ordenId creadoEn
    }
  }
`;
