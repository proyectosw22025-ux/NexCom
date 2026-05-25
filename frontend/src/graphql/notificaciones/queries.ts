import { gql } from "@apollo/client";

export const MIS_NOTIFICACIONES = gql`
  query MisNotificaciones {
    misNotificaciones {
      id tipo titulo mensaje leido url ordenId creadoEn
    }
  }
`;

export const NOTIFICACIONES_NO_LEIDAS = gql`
  query NotificacionesNoLeidas {
    notificacionesNoLeidas
  }
`;
