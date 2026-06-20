import { gql } from "@apollo/client";

export const MIS_CONVERSACIONES = gql`
  query MisConversaciones {
    misConversaciones {
      id productoId otroNombre ultimoMensaje actualizadoEn noLeidos
    }
  }
`;

export const MENSAJES_CONVERSACION = gql`
  query MensajesConversacion($conversacionId: ID!) {
    mensajesConversacion(conversacionId: $conversacionId) {
      id contenido esMio leido creadoEn
    }
  }
`;
