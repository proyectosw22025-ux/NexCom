import { gql } from "@apollo/client";

export const MI_BILLETERA = gql`
  query MiBilletera {
    miBilletera {
      disponible
      movimientos {
        id
        tipo
        monto
        ordenId
        descripcion
        creadoEn
      }
    }
  }
`;

export const MIS_RETIROS_CREDITO = gql`
  query MisRetirosCredito {
    misRetirosCredito {
      id monto estado banco numeroCuenta titular notaAdmin creadoEn resueltoEn
    }
  }
`;

export const SOLICITAR_RETIRO_CREDITO = gql`
  mutation SolicitarRetiroCredito($input: SolicitarRetiroCreditoInput!) {
    solicitarRetiroCredito(input: $input) { id monto estado }
  }
`;

export const RETIROS_CREDITO_PENDIENTES = gql`
  query RetirosCreditoPendientes {
    retirosCreditoPendientes {
      id monto banco numeroCuenta titular compradorNombre compradorEmail creadoEn
    }
  }
`;

export const RESOLVER_RETIRO_CREDITO = gql`
  mutation ResolverRetiroCredito($id: ID!, $aprobar: Boolean!, $nota: String) {
    resolverRetiroCredito(id: $id, aprobar: $aprobar, nota: $nota) { id estado }
  }
`;
