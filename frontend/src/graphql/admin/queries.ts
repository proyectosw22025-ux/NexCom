import { gql } from "@apollo/client";

export const LISTAR_USUARIOS = gql`
  query ListarUsuarios {
    listarUsuarios {
      id
      email
      rol
      verificado
      activo
      creadoEn
      perfilVendedor  { id nombreNegocio ciudad }
      perfilComprador { id nombreCompleto }
    }
  }
`;

export const TODOS_PRODUCTOS = gql`
  query TodosProductos($pagina: Int, $limite: Int, $soloActivos: Boolean) {
    productos(pagina: $pagina, limite: $limite, soloActivos: $soloActivos) {
      items {
        id
        nombre
        precio
        stock
        activo
        destacado
        creadoEn
        categoria { id nombre }
        vendedor   { id nombreNegocio }
        imagenes   { id url orden }
      }
      total
      pagina
      totalPaginas
    }
  }
`;
