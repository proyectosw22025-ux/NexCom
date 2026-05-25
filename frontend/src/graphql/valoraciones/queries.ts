import { gql } from "@apollo/client";

export const MIS_VALORACIONES = gql`
  query MisValoraciones {
    misValoraciones {
      id ordenId compradorId vendedorId calificacion comentario creadoEn
      respuesta { id respuesta creadoEn }
    }
  }
`;

export const VALORACIONES_RECIBIDAS = gql`
  query ValoracionesRecibidas {
    valoracionesRecibidas {
      id ordenId compradorId vendedorId calificacion comentario creadoEn
      respuesta { id respuesta creadoEn }
    }
  }
`;

export const VALORACIONES_DE_VENDEDOR = gql`
  query ValoracionesDeVendedor($vendedorId: ID!) {
    valoracionesDeVendedor(vendedorId: $vendedorId) {
      id calificacion comentario creadoEn
      respuesta { id respuesta creadoEn }
    }
  }
`;
