import { gql } from "@apollo/client";

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
