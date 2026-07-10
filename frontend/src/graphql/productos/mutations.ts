import { gql } from "@apollo/client";

export const FIRMAR_SUBIDA_IMAGEN = gql`
  mutation FirmarSubidaImagen {
    firmarSubidaImagen { cloudName apiKey timestamp folder signature }
  }
`;

export const FIRMAR_SUBIDA_KYC = gql`
  mutation FirmarSubidaKyc {
    firmarSubidaKyc { cloudName apiKey timestamp folder signature tipo }
  }
`;

export const CREAR_PRODUCTO = gql`
  mutation CrearProducto($input: ProductoInput!) {
    crearProducto(input: $input) {
      id nombre precio stock activo
      categoria { nombre } imagenes { url }
    }
  }
`;

export const ACTUALIZAR_PRODUCTO = gql`
  mutation ActualizarProducto($id: ID!, $input: ProductoUpdateInput!) {
    actualizarProducto(id: $id, input: $input) {
      id nombre precio stock activo
      categoria { nombre }
    }
  }
`;

export const ELIMINAR_PRODUCTO = gql`
  mutation EliminarProducto($id: ID!) {
    eliminarProducto(id: $id)
  }
`;

export const TOGGLE_DESTACADO = gql`
  mutation ToggleDestacado($id: ID!) {
    toggleDestacado(id: $id) { id destacado }
  }
`;

export const DESTACAR_MI_PRODUCTO = gql`
  mutation DestacarMiProducto($id: ID!) {
    destacarMiProducto(id: $id) { id destacado }
  }
`;

export const AGREGAR_IMAGENES = gql`
  mutation AgregarImagenes($productoId: ID!, $urls: [String!]!) {
    agregarImagenes(productoId: $productoId, urls: $urls) {
      id imagenes { id url orden }
    }
  }
`;

export const ELIMINAR_IMAGEN = gql`
  mutation EliminarImagen($imagenId: ID!) {
    eliminarImagen(imagenId: $imagenId)
  }
`;
