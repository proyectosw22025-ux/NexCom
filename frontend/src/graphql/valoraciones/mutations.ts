import { gql } from "@apollo/client";

export const CREAR_VALORACION = gql`
  mutation CrearValoracion($input: CrearValoracionInput!) {
    crearValoracion(input: $input) {
      id calificacion comentario creadoEn
    }
  }
`;

export const RESPONDER_VALORACION = gql`
  mutation ResponderValoracion($valoracionId: ID!, $respuesta: String!) {
    responderValoracion(valoracionId: $valoracionId, respuesta: $respuesta) {
      id calificacion comentario creadoEn
      respuesta { id respuesta creadoEn }
    }
  }
`;
