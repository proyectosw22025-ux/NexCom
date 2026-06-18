import { gql } from "@apollo/client";

export const LISTAR_USUARIOS = gql`
  query ListarUsuarios($rol: String, $activo: Boolean, $pagina: Int, $limite: Int) {
    listarUsuarios(rol: $rol, activo: $activo, pagina: $pagina, limite: $limite) {
      items {
        id
        email
        rol
        verificado
        activo
        creadoEn
        perfilVendedor  { id nombreNegocio ciudad ratingPromedio totalVentas totalResenias }
        perfilComprador { id nombreCompleto telefono }
      }
      total
      pagina
      totalPaginas
    }
  }
`;

export const USUARIO_DETALLE = gql`
  query UsuarioDetalle($id: ID!) {
    usuarioDetalle(id: $id) {
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

export const LISTAR_REPORTES = gql`
  query ListarReportes($estado: EstadoReporte, $tipo: TipoReporte, $pagina: Int, $limite: Int) {
    reportes(estado: $estado, tipo: $tipo, pagina: $pagina, limite: $limite) {
      items {
        id
        tipo
        referenciaId
        motivo
        descripcion
        estado
        resolucion
        creadoEn
        resueltoEn
        reportador  { id email }
        resueltoPor { id email }
      }
      total
      pagina
      totalPaginas
    }
  }
`;

export const ESTADISTICAS_ADMIN = gql`
  query EstadisticasAdmin($dias: Int) {
    estadisticasAdmin(dias: $dias) {
      ventasPorDia { fecha total ordenes }
      reportesPendientes
      ingresosPeriodo
      ordenesPeriodo
    }
  }
`;

export const METRICAS_RENDIMIENTO = gql`
  query MetricasRendimiento {
    metricasRendimiento {
      uptimeSegundos
      operaciones { operacion count errores promedioMs p50 p95 p99 }
    }
  }
`;

export const CONFIGURACION_SISTEMA = gql`
  query ConfiguracionSistema {
    configuracionSistema {
      clave
      valor
      tipo
      descripcion
      actualizadoEn
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
