import { gql } from "@apollo/client";

export const CREAR_REPORTE = gql`
  mutation CrearReporte($tipo: TipoReporte!, $referenciaId: ID!, $motivo: String!, $descripcion: String) {
    crearReporte(tipo: $tipo, referenciaId: $referenciaId, motivo: $motivo, descripcion: $descripcion) {
      id
      estado
    }
  }
`;
