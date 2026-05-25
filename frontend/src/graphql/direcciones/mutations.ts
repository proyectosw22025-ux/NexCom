import { gql } from "@apollo/client";

const DIRECCION_FIELDS = gql`
  fragment DireccionFields on Direccion {
    id
    alias
    destinatario
    calle
    zona
    ciudad
    departamento
    referencia
    esPrincipal
  }
`;

export const CREAR_DIRECCION = gql`
  ${DIRECCION_FIELDS}
  mutation CrearDireccion($input: CrearDireccionInput!) {
    crearDireccion(input: $input) {
      ...DireccionFields
    }
  }
`;

export const ACTUALIZAR_DIRECCION = gql`
  ${DIRECCION_FIELDS}
  mutation ActualizarDireccion($id: ID!, $input: ActualizarDireccionInput!) {
    actualizarDireccion(id: $id, input: $input) {
      ...DireccionFields
    }
  }
`;

export const ELIMINAR_DIRECCION = gql`
  mutation EliminarDireccion($id: ID!) {
    eliminarDireccion(id: $id)
  }
`;

export const SET_PRINCIPAL = gql`
  ${DIRECCION_FIELDS}
  mutation SetPrincipal($id: ID!) {
    setPrincipal(id: $id) {
      ...DireccionFields
    }
  }
`;
