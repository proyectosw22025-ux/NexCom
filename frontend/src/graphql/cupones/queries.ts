import { gql } from "@apollo/client";

export const MIS_CUPONES = gql`
  query MisCupones {
    misCupones {
      id codigo tipo valor montoMinimo maxUsos usosActuales vendedorId
      fechaInicio fechaFin activo creadoEn
    }
  }
`;
