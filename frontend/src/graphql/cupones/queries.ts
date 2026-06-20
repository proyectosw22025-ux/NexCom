import { gql } from "@apollo/client";

export const MIS_CUPONES = gql`
  query MisCupones {
    misCupones {
      id codigo tipo valor montoMinimo maxUsos usosActuales vendedorId
      fechaInicio fechaFin activo creadoEn
    }
  }
`;

export const CUPONES_ADMIN = gql`
  query CuponesAdmin {
    cupones {
      id codigo tipo valor montoMinimo maxUsos usosActuales vendedorId
      fechaInicio fechaFin activo creadoEn
    }
  }
`;
