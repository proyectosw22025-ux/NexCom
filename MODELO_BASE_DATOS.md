# Modelo de Base de Datos — NexCom

> Fuente: `backend/prisma/schema.prisma` · Motor: **PostgreSQL** vía **Prisma 7**
> **40 tablas** · **12 enums** · IDs tipo `cuid()` · dinero en `Decimal` (nunca `float`)

> Nota: el comentario de cabecera del `schema.prisma` dice "29 tablas", pero está **desactualizado**: el conteo real de `model` es **40**. Este documento es la fuente correcta.

---

## Cómo leer la multiplicidad

- **1:1** — una fila de A se relaciona con exactamente una de B (se implementa con un campo `@unique`).
- **1:N** — una fila de A tiene muchas de B; cada B pertenece a una A (la FK vive en B).
- **N:M** — muchos con muchos; se resuelve con una **tabla intermedia** (join table).
- `?` = campo/relación **opcional** (puede ser null). `[]` = lista (lado "muchos").
- `onDelete: Cascade` = al borrar el padre se borran los hijos.

---

## Los 12 enums (valores permitidos)

| Enum | Valores |
|---|---|
| `Rol` | ADMIN, VENDEDOR, CLIENTE |
| `EstadoOferta` | PROGRAMADA, ACTIVA, VENCIDA, CANCELADA |
| `EstadoVerificacion` | NO_ENVIADO, PENDIENTE, APROBADO, RECHAZADO |
| `EstadoOrden` | PENDIENTE_PAGO, PAGADO, EN_PREPARACION, ENVIADO, ENTREGADO, COMPLETADO, CANCELADO |
| `EstadoDevolucion` | SOLICITADA, RECHAZADA, REEMBOLSADA |
| `TipoMovimientoSaldo` | VENTA, RETENCION, LIBERACION, REEMBOLSO, SUSCRIPCION |
| `TipoMovimientoPuntos` | GANADOS, CANJEADOS |
| `TipoMovimientoCredito` | REEMBOLSO, USO, RETIRO |
| `EstadoRetiro` | PENDIENTE, PAGADO, RECHAZADO |
| `EstadoPago` | PENDIENTE, COMPLETADO, FALLIDO, REEMBOLSADO |
| `EstadoReporte` | PENDIENTE, REVISANDO, RESUELTO, RECHAZADO |
| `TipoReporte` | PRODUCTO, VENDEDOR, VALORACION, OFERTA, MENSAJE |

---

## Mapa por dominios (las 40 tablas)

| # | Dominio | Tablas |
|---|---|---|
| 1 | **Identidad y sesión** | usuarios, refresh_tokens, tokens_verificacion, perfiles_vendedor, perfiles_comprador, direcciones |
| 2 | **Catálogo** | categorias, productos, imagenes_producto, etiquetas, producto_etiquetas, preguntas_producto |
| 3 | **Descubrimiento** | favoritos, items_guardados |
| 4 | **Carrito** | carritos, items_carrito |
| 5 | **Promociones** | ofertas, oferta_productos, cupones, usos_cupon |
| 6 | **Compra / órdenes** | ordenes, items_orden, historial_estados_orden, pagos, facturas |
| 7 | **Post-venta** | valoraciones, respuestas_valoracion, devoluciones, disputas |
| 8 | **Dinero (billeteras)** | movimientos_saldo, movimientos_puntos, movimientos_credito, solicitudes_retiro, retiros_credito |
| 9 | **Comunicación** | conversaciones, mensajes, notificaciones |
| 10 | **Administración** | reportes, configuracion_sistema, eventos_seguridad |

---

# 1 · Identidad y sesión

### `usuarios` (Usuario) — supertipo del sistema
Cuenta base de cualquier persona. Su rol define de qué perfil cuelga.

| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK `cuid()` |
| email | String | único |
| passwordHash | String | hash bcrypt |
| rol | Rol | default CLIENTE |
| verificado | Boolean | email confirmado |
| activo | Boolean | soft-delete / baneo |
| creadoEn / actualizadoEn | DateTime | auditoría |

**Relaciones:** 1:1 con `perfiles_vendedor` (opcional), 1:1 con `perfiles_comprador` (opcional), 1:N con refresh_tokens, tokens_verificacion, notificaciones, preguntas_producto, y reportes (hechos y resueltos).

### `refresh_tokens` (RefreshToken)
Sesiones persistentes (renovar el access token).

| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| usuarioId | String | FK → usuarios |
| tokenHash | String | único |
| expiraEn | DateTime | |
| revocado | Boolean | logout |
| dispositivo | String? | |

**Relación:** N:1 → usuarios (`Cascade`).

### `tokens_verificacion` (TokenVerificacion)
Tokens de un solo uso para verificar email o resetear contraseña.

| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| usuarioId | String | FK → usuarios |
| token | String | único |
| tipo | String | "EMAIL_VERIFICACION" \| "RESET_PASSWORD" |
| expiraEn | DateTime | |
| usado | Boolean | |

**Relación:** N:1 → usuarios (`Cascade`).

### `perfiles_vendedor` (PerfilVendedor) — subtipo (Class Table Inheritance)
Datos de la microempresa. KYC, plan y reputación.

| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| usuarioId | String | único → FK usuarios (1:1) |
| nombreNegocio | String | |
| descripcion / telefono / logoUrl | String? | |
| ciudad | String | default "Santa Cruz" |
| verificado | Boolean | KYC aprobado (habilita retiros) |
| estadoVerificacion | EstadoVerificacion | flujo KYC |
| documentoUrl / documentoTipo / verificacionNotas | String? | KYC |
| ratingPromedio | Decimal(3,2) | reputación |
| totalVentas / totalResenias | Int | |
| plan | String | "FREE" \| "PRO" |
| planVenceEn | DateTime? | cron degrada a FREE al vencer |

**Relaciones (1:N salvo indicado):** productos, ofertas, ordenesComoVendedor, valoracionesRecibidas, conversaciones, devoluciones, movimientos_saldo, solicitudes_retiro, facturas. 1:1 ← usuarios.

### `perfiles_comprador` (PerfilComprador) — subtipo
Datos del cliente.

| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| usuarioId | String | único → FK usuarios (1:1) |
| nombreCompleto | String | |
| telefono | String? | |

**Relaciones (1:N):** direcciones, ordenesComoComprador, valoracionesHechas, favoritos, conversaciones, devoluciones, facturas, movimientos_puntos, movimientos_credito, retiros_credito, items_guardados. **1:1** con carrito. 1:1 ← usuarios.

### `direcciones` (Direccion)
Direcciones de envío del comprador.

| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| compradorId | String | FK → perfiles_comprador |
| alias / destinatario / calle | String | |
| zona / referencia | String? | |
| ciudad / departamento | String | default "Santa Cruz" |
| esPrincipal | Boolean | |
| activo | Boolean | |

**Relaciones:** N:1 → perfiles_comprador (`Cascade`); 1:N → ordenes.

---

# 2 · Catálogo

### `categorias` (Categoria) — árbol auto-referenciado
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| nombre / slug | String | únicos |
| icono | String? | |
| padreId | String? | FK → categorias (self) |
| orden | Int | |
| activo | Boolean | |

**Relaciones:** auto-relación "Subcategorias" (una categoría tiene N hijos y 0/1 padre); 1:N → productos.

### `productos` (Producto)
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| vendedorId | String | FK → perfiles_vendedor |
| categoriaId | String | FK → categorias |
| nombre | String | índice trigram (búsqueda difusa) |
| descripcion | String? | |
| precio | Decimal(12,4) | |
| stock | Int | |
| activo / destacado | Boolean | |
| totalVendido | Int | |

**Relaciones:** N:1 → perfiles_vendedor, N:1 → categorias; 1:N → imagenes_producto, itemsOrden, items_carrito, favoritos, guardados, preguntas; **N:M** → etiquetas (vía producto_etiquetas) y ofertas (vía oferta_productos).

### `imagenes_producto` (ImagenProducto)
| Atributo | Tipo | Notas |
|---|---|---|
| id / productoId / url | String | orden 0 = principal |
| orden | Int | |

**Relación:** N:1 → productos (`Cascade`).

### `etiquetas` (Etiqueta)
| Atributo | Tipo | Notas |
|---|---|---|
| id / nombre / slug | String | nombre y slug únicos |

**Relación:** N:M → productos (vía producto_etiquetas).

### `producto_etiquetas` (ProductoEtiqueta) — **tabla intermedia N:M**
PK compuesta (productoId, etiquetaId). N:1 a productos y a etiquetas (ambos `Cascade`).

### `preguntas_producto` (PreguntaProducto)
Preguntas públicas sobre un producto y su respuesta.

| Atributo | Tipo | Notas |
|---|---|---|
| id / productoId / usuarioId | String | |
| pregunta | String | |
| respuesta | String? | |
| respondidoEn / creadoEn | DateTime? / DateTime | |

**Relaciones:** N:1 → productos (`Cascade`), N:1 → usuarios.

---

# 3 · Descubrimiento

### `favoritos` (Favorito) — lista de deseos
PK id; único (compradorId, productoId). N:1 → perfiles_comprador (`Cascade`), N:1 → productos (`Cascade`).

### `items_guardados` (ItemGuardado) — "guardar para después"
Misma forma que favoritos: único (compradorId, productoId); N:1 a comprador y producto (`Cascade`).

---

# 4 · Carrito

### `carritos` (Carrito)
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| compradorId | String | único → **1:1** con perfiles_comprador |

**Relaciones:** 1:1 ← perfiles_comprador (`Cascade`); 1:N → items_carrito.

### `items_carrito` (ItemCarrito)
| Atributo | Tipo | Notas |
|---|---|---|
| id / carritoId / productoId | String | único (carritoId, productoId) |
| cantidad | Int | |
| precioSnapshot | Decimal(12,4) | precio congelado al agregar |

**Relaciones:** N:1 → carritos (`Cascade`), N:1 → productos.

---

# 5 · Promociones

### `ofertas` (Oferta) — con vigencia temporal
| Atributo | Tipo | Notas |
|---|---|---|
| id / vendedorId / titulo | String | |
| descripcion | String? | |
| descuento | Decimal(5,2) | % 1.00–100.00 |
| fechaInicio / fechaFin | DateTime | |
| estado | EstadoOferta | cron actualiza automático |

**Relaciones:** N:1 → perfiles_vendedor; **N:M** → productos (vía oferta_productos).

### `oferta_productos` (OfertaProducto) — **tabla intermedia N:M**
PK compuesta (ofertaId, productoId). N:1 a ofertas (`Cascade`) y a productos.

### `cupones` (Cupon)
| Atributo | Tipo | Notas |
|---|---|---|
| id / codigo | String | codigo único |
| tipo | String | "PORCENTAJE" \| "MONTO_FIJO" |
| valor | Decimal(10,4) | |
| montoMinimo | Decimal? | |
| maxUsos / usosActuales | Int | |
| vendedorId | String? | null = cupón global |
| fechaInicio / fechaFin | DateTime | |
| activo | Boolean | |

**Relación:** 1:N → usos_cupon.

### `usos_cupon` (UsoCupon) — evita doble uso
| Atributo | Tipo | Notas |
|---|---|---|
| id / cuponId / usuarioId | String | |
| ordenId | String | **único** (un uso por orden) |
| descuento | Decimal(12,4) | |

**Relaciones:** N:1 → cupones; 1:1 → ordenes.

---

# 6 · Compra / órdenes

### `ordenes` (Orden) — tabla central
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| compradorId | String | FK → perfiles_comprador |
| vendedorId | String | FK → perfiles_vendedor |
| direccionId | String? | FK → direcciones |
| estado | EstadoOrden | máquina de estados |
| subtotal / total | Decimal(12,4) | |
| descuentoCupon / descuentoPuntos / creditoAplicado / costoEnvio | Decimal(12,4) | |
| puntosUsados | Int | |
| metodoEntrega | String | "domicilio" \| "retiro_tienda" |
| puntoRetiro | String? | |
| stripePaymentIntentId | String? | único |
| codigoEntrega / otpEntrega | String? | escrow / QR de entrega |
| intentosCodigo | Int | anti fuerza bruta |
| fondosLiberadosEn / autoLiberaEn | DateTime? | escrow (Compra Protegida) |
| disputaAbierta | Boolean | congela auto-liberación |
| direccionSnapshot | Json? | copia inmutable de la dirección |

**Relaciones:** N:1 → perfiles_comprador, N:1 → perfiles_vendedor, N:1 → direcciones (opcional); 1:N → items_orden, historial_estados_orden, notificaciones; **1:1** → pago, valoracion, usoCupon, devolucion, disputa, factura.

### `items_orden` (ItemOrden) — líneas inmutables de la compra
| Atributo | Tipo | Notas |
|---|---|---|
| id / ordenId / productoId | String | |
| nombreSnapshot | String | nombre congelado |
| cantidad | Int | |
| precioUnitario / subtotal | Decimal(12,4) | |

**Relaciones:** N:1 → ordenes (`Cascade`), N:1 → productos.

### `historial_estados_orden` (HistorialEstadoOrden) — auditoría
| Atributo | Tipo | Notas |
|---|---|---|
| id / ordenId | String | |
| estadoAnterior | EstadoOrden? | null = creación |
| estadoNuevo | EstadoOrden | |
| cambiadoPorId | String | usuarioId |
| notas | String? | |

**Relación:** N:1 → ordenes (`Cascade`).

### `pagos` (Pago)
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| ordenId | String | **único** → 1:1 con ordenes |
| monto | Decimal(12,4) | |
| moneda | String | default USD |
| metodo | String | "card" \| "qr" |
| stripeChargeId | String? | |
| estado | EstadoPago | |

**Relación:** 1:1 → ordenes.

### `facturas` (Factura) — factura simulada (formato boliviano)
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| ordenId | String | único → 1:1 con ordenes |
| vendedorId / compradorId | String | FKs |
| numero | Int | correlativo por vendedor: único (vendedorId, numero) |
| nitComprador / razonSocial | String | |
| importeTotal / iva | Decimal(12,4) | IVA 13% por dentro |
| codigoControl | String | |

**Relaciones:** 1:1 → ordenes; N:1 → perfiles_vendedor y perfiles_comprador.

---

# 7 · Post-venta

### `valoraciones` (Valoracion) — reseña post-compra
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| ordenId | String | único → 1:1 con ordenes |
| compradorId / vendedorId | String | FKs |
| calificacion | Int | 1–5 (CHECK en migración) |
| comentario | String? | |

**Relaciones:** 1:1 → ordenes; N:1 → perfiles_comprador y perfiles_vendedor; **1:1** → respuesta_valoracion.

### `respuestas_valoracion` (RespuestaValoracion)
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| valoracionId | String | único → 1:1 con valoraciones |
| vendedorId | String | |
| respuesta | String | |

**Relación:** 1:1 → valoraciones (`Cascade`).

### `devoluciones` (Devolucion)
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| ordenId | String | único → 1:1 con ordenes |
| compradorId / vendedorId | String | FKs |
| motivo | String | |
| tipoProblema | String? | DEFECTUOSO \| NO_CORRESPONDE \| INCOMPLETO \| OTRO |
| evidenciaUrls | String[] | fotos |
| estado | EstadoDevolucion | |
| montoReembolso | Decimal(12,4) | |

**Relaciones:** 1:1 → ordenes; N:1 → perfiles_comprador y perfiles_vendedor.

### `disputas` (Disputa) — mediación del admin durante la garantía
| Atributo | Tipo | Notas |
|---|---|---|
| id | String | PK |
| ordenId | String | único → 1:1 con ordenes |
| compradorId / vendedorId | String | **sin FK** (strings sueltos, desacoplado) |
| motivo | String | NO_RECIBIDO \| PRODUCTO_INCORRECTO \| DANADO \| OTRO |
| descripcion / evidenciaUrl | String? | |
| estado | String | ABIERTA \| RESUELTA_COMPRADOR \| RESUELTA_VENDEDOR |
| resueltoPorId | String? | usuarioId del admin |

**Relación:** 1:1 → ordenes (única FK real).

---

# 8 · Dinero (billeteras contables append-only)

> Patrón "libro mayor": nunca se muta un saldo agregado; el balance se **calcula sumando movimientos**. Evita condiciones de carrera y drift.

### `movimientos_saldo` (MovimientoSaldo) — billetera del VENDEDOR
Balance = f(RETENCION, LIBERACION, REEMBOLSO, SUSCRIPCION...).

| Atributo | Tipo | Notas |
|---|---|---|
| id / vendedorId | String | |
| tipo | TipoMovimientoSaldo | |
| monto | Decimal(12,4) | siempre positivo; el signo lo da `tipo` |
| comision | Decimal(12,4) | informativo |
| ordenId | String? | idempotencia (único por tipo) |

**Relación:** N:1 → perfiles_vendedor.

### `movimientos_puntos` (MovimientoPuntos) — puntos de fidelidad del COMPRADOR
Balance = SUM(GANADOS) − SUM(CANJEADOS).

| Atributo | Tipo | Notas |
|---|---|---|
| id / compradorId | String | |
| tipo | TipoMovimientoPuntos | |
| puntos | Int | |
| ordenId | String? | |

**Relación:** N:1 → perfiles_comprador.

### `movimientos_credito` (MovimientoCredito) — billetera de dinero del COMPRADOR
Saldo = SUM(REEMBOLSO) − SUM(USO) − SUM(RETIRO). Se acredita con reembolsos aprobados.

| Atributo | Tipo | Notas |
|---|---|---|
| id / compradorId | String | |
| tipo | TipoMovimientoCredito | |
| monto | Decimal(12,4) | |
| ordenId | String? | |

**Relación:** N:1 → perfiles_comprador.

### `solicitudes_retiro` (SolicitudRetiro) — el VENDEDOR retira a banco
| Atributo | Tipo | Notas |
|---|---|---|
| id / vendedorId | String | |
| monto | Decimal(12,4) | |
| estado | EstadoRetiro | aprobado por admin |
| banco / numeroCuenta / titular | String | |
| notaAdmin | String? | |

**Relación:** N:1 → perfiles_vendedor.

### `retiros_credito` (RetiroCredito) — el COMPRADOR retira su crédito a banco
Misma forma que solicitudes_retiro pero N:1 → perfiles_comprador.

---

# 9 · Comunicación

### `conversaciones` (Conversacion) — chat comprador ↔ vendedor
| Atributo | Tipo | Notas |
|---|---|---|
| id / compradorId / vendedorId | String | |
| productoId | String? | opcional (chat general) |
| activo | Boolean | único (compradorId, vendedorId, productoId) |

**Relaciones:** N:1 → perfiles_comprador y perfiles_vendedor; 1:N → mensajes.

### `mensajes` (Mensaje)
| Atributo | Tipo | Notas |
|---|---|---|
| id / conversacionId / emisorId | String | |
| contenido | String | |
| leido | Boolean | |

**Relación:** N:1 → conversaciones (`Cascade`).

### `notificaciones` (Notificacion) — sistema transversal (tiempo real por WebSocket)
| Atributo | Tipo | Notas |
|---|---|---|
| id / usuarioId | String | |
| ordenId | String? | opcional |
| tipo / titulo / mensaje | String | |
| leido | Boolean | |
| url | String? | link de acción en el frontend |

**Relaciones:** N:1 → usuarios (`Cascade`); N:1 → ordenes (opcional).

---

# 10 · Administración

### `reportes` (Reporte) — moderación
| Atributo | Tipo | Notas |
|---|---|---|
| id / reportadorId | String | |
| tipo | TipoReporte | |
| referenciaId | String | id del objeto reportado (polimórfico) |
| motivo | String | FRAUDE \| SPAM \| ... |
| estado | EstadoReporte | |
| resueltoPorId | String? | admin |

**Relaciones:** N:1 → usuarios (reportador) y N:1 → usuarios (resueltoPor, opcional). Dos relaciones nombradas al mismo modelo.

### `configuracion_sistema` (ConfiguracionSistema) — parámetros dinámicos
| Atributo | Tipo | Notas |
|---|---|---|
| clave | String | **PK** (no usa cuid) |
| valor / tipo / descripcion | String | tipo: NUMBER \| STRING \| BOOLEAN \| JSON |

**Sin relaciones** (tabla clave-valor).

### `eventos_seguridad` (EventoSeguridad) — audit log inmutable
| Atributo | Tipo | Notas |
|---|---|---|
| id / tipo | String | LIBERACION \| INTENTO_CODIGO_FALLIDO \| ... |
| usuarioId / ordenId | String? | **sin FK** (desacoplado a propósito) |
| metadata | Json? | |

**Sin relaciones formales** (append-only, aislado).

---

## Resumen de multiplicidades clave (para la defensa)

| Relación | Tipo | Por qué |
|---|---|---|
| usuarios → perfiles_vendedor / perfiles_comprador | **1:1** | Herencia por tabla (Class Table Inheritance): un usuario ES vendedor O comprador |
| perfiles_comprador → carritos | **1:1** | Un carrito activo por comprador |
| ordenes → pago / factura / valoracion / devolucion / disputa | **1:1** | Cada uno existe a lo más una vez por orden (campo `@unique ordenId`) |
| productos ↔ etiquetas | **N:M** | Tabla intermedia `producto_etiquetas` |
| ofertas ↔ productos | **N:M** | Tabla intermedia `oferta_productos` |
| categorias → categorias | **auto 1:N** | Árbol de subcategorías (`padreId`) |
| perfiles_vendedor → productos / ordenes | **1:N** | Un vendedor, muchos productos/ventas |
| perfiles_comprador → direcciones / favoritos / ordenes | **1:N** | Un comprador, muchos de cada uno |
| ordenes → items_orden / historial_estados_orden | **1:N** | Una orden con muchas líneas y muchos cambios de estado |

## Decisiones de diseño defendibles

1. **Herencia por tablas** (usuarios + perfiles): separa lo común (login) de lo específico de cada rol sin columnas nulas.
2. **Snapshots inmutables** (`nombreSnapshot`, `precioSnapshot`, `direccionSnapshot`): la orden preserva los datos del momento de compra aunque el producto/dirección cambien después.
3. **Libros mayores append-only** (movimientos_*): el saldo se calcula sumando; nunca se sobre-escribe un total → sin condiciones de carrera.
4. **Idempotencia por `ordenId` único** en pagos y movimientos: evita doble cobro / doble retención ante reintentos (ej. webhooks de Stripe).
5. **Tablas de auditoría** (historial_estados_orden, eventos_seguridad): trazabilidad completa de acciones sensibles.
