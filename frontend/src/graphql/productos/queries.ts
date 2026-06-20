import { gql } from "@apollo/client";

const PRODUCTO_FIELDS = gql`
  fragment ProductoFields on Producto {
    id
    nombre
    descripcion
    precio
    stock
    activo
    destacado
    totalVendido
    creadoEn
    categoria { id nombre slug }
    vendedor   { id nombreNegocio ciudad logoUrl ratingPromedio totalResenias telefono }
    imagenes   { id url orden }
    etiquetas  { id nombre slug }
  }
`;

export const PRODUCTOS = gql`
  ${PRODUCTO_FIELDS}
  query Productos($pagina: Int, $limite: Int, $categoriaId: ID, $soloActivos: Boolean) {
    productos(pagina: $pagina, limite: $limite, categoriaId: $categoriaId, soloActivos: $soloActivos) {
      items { ...ProductoFields }
      total
      pagina
      totalPaginas
    }
  }
`;

export const PRODUCTO = gql`
  ${PRODUCTO_FIELDS}
  query Producto($id: ID!) {
    producto(id: $id) { ...ProductoFields }
  }
`;

export const PRODUCTOS_RECOMENDADOS = gql`
  ${PRODUCTO_FIELDS}
  query ProductosRecomendados($productoId: ID!, $limite: Int) {
    productosRecomendados(productoId: $productoId, limite: $limite) { ...ProductoFields }
  }
`;

export const MIS_PRODUCTOS = gql`
  ${PRODUCTO_FIELDS}
  query MisProductos {
    misProductos { ...ProductoFields }
  }
`;

export const BUSCAR = gql`
  ${PRODUCTO_FIELDS}
  query Buscar($termino: String!, $pagina: Int, $limite: Int, $categoriaId: ID) {
    buscar(termino: $termino, pagina: $pagina, limite: $limite, categoriaId: $categoriaId) {
      items { ...ProductoFields }
      total
      pagina
      totalPaginas
      termino
    }
  }
`;

export const SUGERENCIAS_BUSQUEDA = gql`
  query SugerenciasBusqueda($termino: String!) {
    sugerenciasBusqueda(termino: $termino) {
      id nombre precio imagenUrl
    }
  }
`;

export const CATEGORIAS = gql`
  query Categorias($soloRaices: Boolean) {
    categorias(soloRaices: $soloRaices) {
      id nombre slug icono orden
      hijos { id nombre slug icono orden }
    }
  }
`;
