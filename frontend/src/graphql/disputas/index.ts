import { gql } from "@apollo/client";

const DISPUTA_FIELDS = gql`
  fragment DisputaFields on Disputa {
    id ordenId ordenCorto motivo descripcion evidenciaUrl estado
    resolucionNota total compradorNombre vendedorNombre creadoEn resueltoEn
  }
`;

export const DISPUTA_DE_ORDEN = gql`
  ${DISPUTA_FIELDS}
  query DisputaDeOrden($ordenId: ID!) {
    disputaDeOrden(ordenId: $ordenId) { ...DisputaFields }
  }
`;

export const MIS_DISPUTAS = gql`
  ${DISPUTA_FIELDS}
  query MisDisputas { misDisputas { ...DisputaFields } }
`;

export const DISPUTAS_PENDIENTES = gql`
  ${DISPUTA_FIELDS}
  query DisputasPendientes {
    disputasPendientes { ...DisputaFields }
    disputasResueltas  { ...DisputaFields }
  }
`;

export const ABRIR_DISPUTA = gql`
  ${DISPUTA_FIELDS}
  mutation AbrirDisputa($ordenId: ID!, $motivo: String!, $descripcion: String, $evidenciaUrl: String) {
    abrirDisputa(ordenId: $ordenId, motivo: $motivo, descripcion: $descripcion, evidenciaUrl: $evidenciaUrl) {
      ...DisputaFields
    }
  }
`;

export const RESOLVER_DISPUTA = gql`
  ${DISPUTA_FIELDS}
  mutation ResolverDisputa($disputaId: ID!, $aFavor: String!, $nota: String) {
    resolverDisputa(disputaId: $disputaId, aFavor: $aFavor, nota: $nota) { ...DisputaFields }
  }
`;
