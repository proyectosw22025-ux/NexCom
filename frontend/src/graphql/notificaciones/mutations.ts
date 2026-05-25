import { gql } from "@apollo/client";

export const MARCAR_NOTIFICACION_LEIDA = gql`
  mutation MarcarNotificacionLeida($id: ID!) {
    marcarNotificacionLeida(id: $id) {
      id leido
    }
  }
`;

export const MARCAR_TODAS_LEIDAS = gql`
  mutation MarcarTodasLeidas {
    marcarTodasLeidas
  }
`;
