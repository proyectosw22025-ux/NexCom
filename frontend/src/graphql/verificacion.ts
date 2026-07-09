import { gql } from "@apollo/client";

// El vendedor envía su documento de identidad para revisión (KYC).
export const ENVIAR_VERIFICACION = gql`
  mutation EnviarVerificacion($documentoUrl: String!, $documentoTipo: String!) {
    enviarVerificacion(documentoUrl: $documentoUrl, documentoTipo: $documentoTipo) {
      id
      verificado
      estadoVerificacion
      verificacionNotas
      documentoUrl
      documentoTipo
    }
  }
`;

// Admin: cola de verificaciones pendientes.
export const VERIFICACIONES_PENDIENTES = gql`
  query VerificacionesPendientes {
    verificacionesPendientes {
      id
      nombreNegocio
      ciudad
      email
      telefono
      documentoUrl
      documentoTipo
      enviadaEn
    }
  }
`;

// Admin: aprobar o rechazar una verificación.
export const RESOLVER_VERIFICACION = gql`
  mutation ResolverVerificacion($vendedorId: ID!, $aprobar: Boolean!, $notas: String) {
    resolverVerificacion(vendedorId: $vendedorId, aprobar: $aprobar, notas: $notas) {
      id
      verificado
      estadoVerificacion
    }
  }
`;
