import { gql } from "@apollo/client";

export const PREGUNTAS_PRODUCTO = gql`
  query PreguntasProducto($productoId: ID!) {
    preguntasProducto(productoId: $productoId) {
      id pregunta respuesta respondidoEn creadoEn autor
    }
  }
`;
