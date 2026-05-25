import { gql } from "@apollo/client";

const OFERTA_FIELDS = gql`
  fragment OfertaFieldsMut on Oferta {
    id
    titulo
    descripcion
    descuento
    fechaInicio
    fechaFin
    estado
    creadoEn
    productos {
      id
      nombre
      precio
    }
  }
`;

export const CREAR_OFERTA = gql`
  ${OFERTA_FIELDS}
  mutation CrearOferta($input: CrearOfertaInput!) {
    crearOferta(input: $input) {
      ...OfertaFieldsMut
    }
  }
`;

export const ACTUALIZAR_OFERTA = gql`
  ${OFERTA_FIELDS}
  mutation ActualizarOferta($id: ID!, $input: ActualizarOfertaInput!) {
    actualizarOferta(id: $id, input: $input) {
      ...OfertaFieldsMut
    }
  }
`;

export const CANCELAR_OFERTA = gql`
  ${OFERTA_FIELDS}
  mutation CancelarOferta($id: ID!) {
    cancelarOferta(id: $id) {
      ...OfertaFieldsMut
    }
  }
`;
