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
