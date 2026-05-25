import { gql } from "@apollo/client";

const OFERTA_FIELDS = gql`
  fragment OfertaFields on Oferta {
    id
    titulo
    descripcion
    descuento
    fechaInicio
    fechaFin
    estado
    creadoEn
    productos {
      id
      nombre
      precio
    }
  }
`;

export const OFERTAS_ACTIVAS = gql`
  ${OFERTA_FIELDS}
  query OfertasActivas {
    ofertasActivas {
      ...OfertaFields
    }
  }
`;

export const MIS_OFERTAS = gql`
  ${OFERTA_FIELDS}
  query MisOfertas {
    misOfertas {
      ...OfertaFields
    }
  }
`;
