import { gql } from "@apollo/client";

export const MIS_PUNTOS = gql`
  query MisPuntos {
    misPuntos { disponibles valorBs }
  }
`;

export const MIS_PUNTOS_DETALLE = gql`
  query MisPuntosDetalle {
    misPuntos { disponibles valorBs }
    misMovimientosPuntos { id tipo puntos ordenIdCorto descripcion creadoEn }
  }
`;
