import { gql } from "@apollo/client";

export const MIS_GUARDADOS = gql`
  query MisGuardados {
    misGuardados { id nombre precio stock activo imagenUrl }
  }
`;

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
          vendedor  { id nombreNegocio }
        }
      }
    }
  }
`;
