import { gql } from "@apollo/client";

export const TOGGLE_ACTIVO_USUARIO = gql`
  mutation ToggleActivoUsuario($id: ID!) {
    toggleActivoUsuario(id: $id) {
      id
      email
      rol
      verificado
      activo
      creadoEn
      perfilVendedor  { id nombreNegocio ciudad ratingPromedio totalVentas totalResenias }
      perfilComprador { id nombreCompleto telefono }
    }
  }
`;

export const CAMBIAR_ROL_USUARIO = gql`
  mutation CambiarRolUsuario($id: ID!, $rol: String!) {
    cambiarRolUsuario(id: $id, rol: $rol) {
      id
      email
      rol
      verificado
      activo
      creadoEn
      perfilVendedor  { id nombreNegocio ciudad ratingPromedio totalVentas totalResenias }
      perfilComprador { id nombreCompleto telefono }
    }
  }
`;

export const CREAR_REPORTE = gql`
  mutation CrearReporte(
    $tipo:         TipoReporte!
    $referenciaId: ID!
    $motivo:       String!
    $descripcion:  String
  ) {
    crearReporte(tipo: $tipo, referenciaId: $referenciaId, motivo: $motivo, descripcion: $descripcion) {
      id
      tipo
      estado
      motivo
      creadoEn
    }
  }
`;

export const RESOLVER_REPORTE = gql`
  mutation ResolverReporte($id: ID!, $estado: EstadoReporte!, $resolucion: String!) {
    resolverReporte(id: $id, estado: $estado, resolucion: $resolucion) {
      id
      estado
      resolucion
      resueltoEn
      resueltoPor { id email }
    }
  }
`;

export const ACTUALIZAR_CONFIG = gql`
  mutation ActualizarConfig($clave: String!, $valor: String!) {
    actualizarConfig(clave: $clave, valor: $valor) {
      clave
      valor
      tipo
      descripcion
      actualizadoEn
    }
  }
`;
