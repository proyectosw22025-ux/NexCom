import { gql } from "@apollo/client";

export const VALIDAR_CUPON = gql`
  mutation ValidarCupon($codigo: String!, $subtotal: String!) {
    validarCupon(codigo: $codigo, subtotal: $subtotal) {
      cuponId
      codigo
      tipo
      valor
      descuento
      totalConDescuento
    }
  }
`;
