import { gql } from "@apollo/client";

export const CREAR_PREGUNTA = gql`
  mutation CrearPregunta($productoId: ID!, $pregunta: String!) {
    crearPregunta(productoId: $productoId, pregunta: $pregunta) {
      id pregunta respuesta respondidoEn creadoEn autor
    }
  }
`;

export const RESPONDER_PREGUNTA = gql`
  mutation ResponderPregunta($preguntaId: ID!, $respuesta: String!) {
    responderPregunta(preguntaId: $preguntaId, respuesta: $respuesta) {
      id pregunta respuesta respondidoEn creadoEn autor
    }
  }
`;
