import { gql } from "@apollo/client";

const RETIRO_FIELDS = gql`
  fragment RetiroFields on SolicitudRetiro {
    id monto estado banco numeroCuenta titular notaAdmin vendedorNombre creadoEn resueltoEn
  }
`;

export const MI_SALDO = gql`
  query MiSaldo {
    miSaldo { disponible retirable enAsentamiento retenido generado enRevision retirado comisionTotal }
    misMovimientos { id tipo monto comision ordenIdCorto descripcion creadoEn }
    misRetiros { ...RetiroFields }
  }
  ${RETIRO_FIELDS}
`;

export const SOLICITAR_RETIRO = gql`
  ${RETIRO_FIELDS}
  mutation SolicitarRetiro($monto: String!, $banco: String!, $numeroCuenta: String!, $titular: String!) {
    solicitarRetiro(monto: $monto, banco: $banco, numeroCuenta: $numeroCuenta, titular: $titular) { ...RetiroFields }
  }
`;

export const RETIROS_ADMIN = gql`
  ${RETIRO_FIELDS}
  query RetirosAdmin {
    retirosPendientes { ...RetiroFields }
    retirosResueltos { ...RetiroFields }
  }
`;

export const RESOLVER_RETIRO = gql`
  ${RETIRO_FIELDS}
  mutation ResolverRetiro($id: ID!, $aprobar: Boolean!, $nota: String) {
    resolverRetiro(id: $id, aprobar: $aprobar, nota: $nota) { ...RetiroFields }
  }
`;
