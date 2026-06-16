import { gql } from "@apollo/client";

export const MIS_FAVORITOS = gql`
  query MisFavoritos {
    misFavoritos {
      id
      creadoEn
      producto {
        id nombre descripcion precio stock activo destacado
        categoria { id nombre slug }
        vendedor  { id nombreNegocio ratingPromedio totalResenias }
        imagenes  { url orden }
        etiquetas { nombre }
      }
    }
  }
`;
