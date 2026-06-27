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
        perfilVendedor  { id nombreNegocio ciudad ratingPromedio totalVentas totalResenias verificado }
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

export const ANALITICA_ADMIN = gql`
  query AnaliticaAdmin($dias: Int) {
    analiticaAdmin(dias: $dias) {
      ingresos       { valor delta }
      ordenes        { valor delta }
      ticketPromedio { valor delta }
      comision       { valor delta }
      usuariosNuevos { valor delta }
      serie          { fecha ingresos ordenes }
      porMetodoPago  { etiqueta valor monto }
      porEstado      { etiqueta valor monto }
      porCiudad      { etiqueta valor monto }
      topVendedores  { nombreNegocio ingresos ventas rating }
    }
  }
`;

export const ANALITICA_PRODUCTOS = gql`
  query AnaliticaProductos($dias: Int) {
    analiticaProductos(dias: $dias) {
      unidades         { valor delta }
      ingresos         { valor delta }
      productosActivos
      sinVentas
      inventario       { enStock bajo agotado }
      topProductos     { nombre vendedor unidades ingresos }
      porCategoria     { etiqueta valor monto }
    }
  }
`;

export const ANALITICA_CLIENTES = gql`
  query AnaliticaClientes($dias: Int) {
    analiticaClientes(dias: $dias) {
      clientesActivos { valor delta }
      ticketPromedio  { valor delta }
      nuevos
      recurrentes
      frecuencia      { f1 f2 f3 f4 }
      topClientes     { nombre ordenes gasto ticket }
    }
  }
`;

export const EVENTOS_SEGURIDAD = gql`
  query EventosSeguridad($tipo: String, $limite: Int) {
    eventosSeguridad(tipo: $tipo, limite: $limite) {
      id tipo usuarioId ordenId metadata creadoEn
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
      comisionPorcentaje
      comisionPeriodo
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
