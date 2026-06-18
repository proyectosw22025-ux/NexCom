import { gql } from "@apollo/client";

export const CREAR_CUPON = gql`
  mutation CrearCupon($input: CrearCuponInput!) {
    crearCupon(input: $input) {
      id codigo tipo valor montoMinimo maxUsos usosActuales vendedorId
      fechaInicio fechaFin activo creadoEn
    }
  }
`;

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
