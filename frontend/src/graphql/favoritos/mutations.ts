import { gql } from "@apollo/client";

export const TOGGLE_FAVORITO = gql`
  mutation ToggleFavorito($productoId: ID!) {
    toggleFavorito(productoId: $productoId)
  }
`;
