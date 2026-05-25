import { gql } from "@apollo/client";

export const MI_CARRITO = gql`
  query MiCarrito {
    miCarrito {
      id
      total
      totalItems
      items {
        id
        cantidad
        precioSnapshot
        subtotal
        producto {
          id nombre precio stock activo
          imagenes { url orden }
          categoria { nombre }
          vendedor  { nombreNegocio }
        }
      }
    }
  }
`;
