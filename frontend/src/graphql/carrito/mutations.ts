import { gql } from "@apollo/client";

const CARRITO_FIELDS = gql`
  fragment CarritoFields on Carrito {
    id total totalItems
    items {
      id cantidad precioSnapshot subtotal
      producto { id nombre precio stock activo imagenes { url orden } vendedor { id nombreNegocio } }
    }
  }
`;

export const AGREGAR_AL_CARRITO = gql`
  ${CARRITO_FIELDS}
  mutation AgregarAlCarrito($productoId: ID!, $cantidad: Int!) {
    agregarAlCarrito(productoId: $productoId, cantidad: $cantidad) { ...CarritoFields }
  }
`;

export const ACTUALIZAR_CANTIDAD = gql`
  ${CARRITO_FIELDS}
  mutation ActualizarCantidad($productoId: ID!, $cantidad: Int!) {
    actualizarCantidad(productoId: $productoId, cantidad: $cantidad) { ...CarritoFields }
  }
`;

export const ELIMINAR_DEL_CARRITO = gql`
  ${CARRITO_FIELDS}
  mutation EliminarDelCarrito($productoId: ID!) {
    eliminarDelCarrito(productoId: $productoId) { ...CarritoFields }
  }
`;

export const VACIAR_CARRITO = gql`
  mutation VaciarCarrito {
    vaciarCarrito
  }
`;
