import { gql } from "@apollo/client";

export const INICIAR_CONVERSACION = gql`
  mutation IniciarConversacion($vendedorId: ID!, $productoId: ID) {
    iniciarConversacion(vendedorId: $vendedorId, productoId: $productoId)
  }
`;

export const ENVIAR_MENSAJE = gql`
  mutation EnviarMensaje($conversacionId: ID!, $contenido: String!) {
    enviarMensaje(conversacionId: $conversacionId, contenido: $contenido) {
      id contenido esMio leido creadoEn
    }
  }
`;
