# DISEÑO DE BASE DE DATOS — NEXCOM v2.0 (COMPLETO)
> Análisis de brechas + Schema definitivo con todas las tablas necesarias
> Motor: PostgreSQL 17 | ORM: Prisma 5

---

## ANÁLISIS DE BRECHAS — ¿Qué faltaba en v1.0?

### El flujo roto más crítico del sistema

```
FLUJO REAL DE UN COMPRADOR en un marketplace:

  1. Busca productos          ← ✓ teníamos (Búsqueda + Filtros)
  2. Ve el detalle            ← ✓ teníamos (Catálogo)
  3. Lo guarda para después   ← ✗ FALTABA (Favoritos)
  4. Lo agrega al carrito     ← ✗ FALTABA (Carrito — CRÍTICO)
  5. Elige dirección de envío ← ✗ FALTABA (Direcciones — CRÍTICO)
  6. Aplica un cupón          ← ✗ FALTABA (Cupones)
  7. Paga                     ← ✓ teníamos (Stripe)
  8. Pregunta al vendedor     ← ✗ FALTABA (Mensajería)
  9. Valora la compra         ← ✓ teníamos (Valoraciones)
  10. Ve la respuesta          ← ✗ FALTABA (Respuestas a valoraciones)
```

---

## INVENTARIO COMPLETO — ANTES vs AHORA

| # | Tabla | Estado | Módulo | Prioridad |
|---|---|---|---|---|
| 1 | `usuarios` | ✓ Existía | Auth | — |
| 2 | `tokens_verificacion` | ✓ Existía | Auth | — |
| 3 | `refresh_tokens` | **+ NUEVA** | Auth | CRÍTICA |
| 4 | `perfiles_vendedor` | ✓ Existía | Auth | — |
| 5 | `perfiles_comprador` | ✓ Existía | Auth | — |
| 6 | `direcciones` | **+ NUEVA** | Compradores | CRÍTICA |
| 7 | `categorias` | ✓ Existía | Catálogo | — |
| 8 | `productos` | ✓ Existía | Catálogo | — |
| 9 | `imagenes_producto` | ✓ Existía | Catálogo | — |
| 10 | `etiquetas` | **+ NUEVA** | Catálogo | IMPORTANTE |
| 11 | `producto_etiquetas` | **+ NUEVA** | Catálogo | IMPORTANTE |
| 12 | `favoritos` | **+ NUEVA** | Catálogo | IMPORTANTE |
| 13 | `carritos` | **+ NUEVA** | Carrito | CRÍTICA |
| 14 | `items_carrito` | **+ NUEVA** | Carrito | CRÍTICA |
| 15 | `ofertas` | ✓ Existía | Ofertas | — |
| 16 | `oferta_productos` | **+ NUEVA** | Ofertas | IMPORTANTE |
| 17 | `cupones` | **+ NUEVA** | Ofertas | IMPORTANTE |
| 18 | `usos_cupon` | **+ NUEVA** | Ofertas | IMPORTANTE |
| 19 | `ordenes` | ✓ Existía (modificada) | Órdenes | — |
| 20 | `items_orden` | ✓ Existía | Órdenes | — |
| 21 | `historial_estados_orden` | **+ NUEVA** | Órdenes | CRÍTICA |
| 22 | `pagos` | ✓ Existía | Pagos | — |
| 23 | `valoraciones` | ✓ Existía | Valoraciones | — |
| 24 | `respuestas_valoracion` | **+ NUEVA** | Valoraciones | IMPORTANTE |
| 25 | `conversaciones` | **+ NUEVA** | Mensajería | FUTURA |
| 26 | `mensajes` | **+ NUEVA** | Mensajería | FUTURA |
| 27 | `reportes` | **+ NUEVA** | Admin | IMPORTANTE |
| 28 | `configuracion_sistema` | **+ NUEVA** | Admin | IMPORTANTE |
| 29 | `notificaciones` | ✓ Existía | Transversal | — |

**TOTAL: 29 tablas** (13 originales + 16 nuevas)

---

## MÓDULOS — ANTES vs AHORA

| # | Módulo | Estado | Sprint |
|---|---|---|---|
| 1 | Auth + Roles + JWT | ✓ Existía | 1 |
| 2 | Catálogo de Productos | ✓ Existía (ampliado) | 2 |
| 3 | Búsqueda y Filtros | ✓ Existía | 2 |
| 4 | **Carrito de Compras** | **NUEVO** | 2 |
| 5 | Ofertas con Vigencia | ✓ Existía (ampliado) | 3 |
| 6 | Pasarela de Pagos (Stripe) | ✓ Existía | 3 |
| 7 | Gestión de Órdenes | ✓ Existía (ampliado) | 4 |
| 8 | Valoraciones y Reseñas | ✓ Existía (ampliado) | 4 |
| 9 | **Reportes y Moderación** | **NUEVO** | 5 |
| 10 | Panel de Administración | ✓ Existía (ampliado) | 5 |
| 11 | **Mensajería** | **NUEVO (futuro)** | Post-MVP |

**TOTAL: 10 módulos activos + 1 futuro**

---

## SCHEMA PRISMA DEFINITIVO — NEXCOM v2.0

```prisma
// ══════════════════════════════════════════════════════════════
// GENERADOR Y DATASOURCE
// ══════════════════════════════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ══════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════

enum Rol {
  ADMIN
  VENDEDOR
  COMPRADOR
}

enum EstadoOferta {
  PROGRAMADA
  ACTIVA
  VENCIDA
  CANCELADA
}

enum EstadoOrden {
  PENDIENTE_PAGO
  PAGADO
  EN_PREPARACION
  ENVIADO
  ENTREGADO
  COMPLETADO
  CANCELADO
}

enum EstadoPago {
  PENDIENTE
  COMPLETADO
  FALLIDO
  REEMBOLSADO
}

enum EstadoReporte {
  PENDIENTE
  REVISANDO
  RESUELTO
  RECHAZADO
}

enum TipoReporte {
  PRODUCTO
  VENDEDOR
  VALORACION
  OFERTA
  MENSAJE
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 1: AUTH Y USUARIOS
// ══════════════════════════════════════════════════════════════

model Usuario {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  rol           Rol      @default(COMPRADOR)
  verificado    Boolean  @default(false)
  activo        Boolean  @default(true)
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  perfilVendedor   PerfilVendedor?
  perfilComprador  PerfilComprador?
  tokens           TokenVerificacion[]
  refreshTokens    RefreshToken[]
  notificaciones   Notificacion[]
  reportesHechos   Reporte[]          @relation("ReportesHechos")
  reportesResueltos Reporte[]         @relation("ReportesResueltos")

  @@map("usuarios")
}

// NUEVA: Gestión de sesiones persistentes
// Por qué: El access token JWT dura 15min. Sin refresh token,
// el usuario debe hacer login cada 15 minutos — inaceptable.
model RefreshToken {
  id          String   @id @default(cuid())
  usuarioId   String
  tokenHash   String   @unique  // guardamos el HASH del token, nunca el token en texto plano
  expiraEn    DateTime
  revocado    Boolean  @default(false)
  dispositivo String?            // "Chrome/Windows", "Mobile/Android" — para gestión de sesiones
  creadoEn    DateTime @default(now())

  usuario     Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId, revocado])
  @@map("refresh_tokens")
}

model TokenVerificacion {
  id        String   @id @default(cuid())
  usuarioId String
  token     String   @unique
  tipo      String   // "EMAIL_VERIFICACION" | "RESET_PASSWORD"
  expiraEn  DateTime
  usado     Boolean  @default(false)

  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId, tipo])
  @@map("tokens_verificacion")
}

// ══════════════════════════════════════════════════════════════
// PERFILES ESPECIALIZADOS (Class Table Inheritance)
// ══════════════════════════════════════════════════════════════

model PerfilVendedor {
  id             String   @id @default(cuid())
  usuarioId      String   @unique
  nombreNegocio  String
  descripcion    String?
  telefono       String?
  ciudad         String   @default("Santa Cruz")
  logoUrl        String?
  ratingPromedio Decimal  @default(0)   @db.Decimal(3, 2)
  totalVentas    Int      @default(0)
  totalReseñas   Int      @default(0)   // desnormalizado para evitar COUNT frecuente
  creadoEn       DateTime @default(now())

  usuario               Usuario       @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  productos             Producto[]
  ofertas               Oferta[]
  ordenesComoVendedor   Orden[]       @relation("OrdenesVendedor")
  valoracionesRecibidas Valoracion[]  @relation("ValoracionesVendedor")
  conversaciones        Conversacion[]

  @@map("perfiles_vendedor")
}

model PerfilComprador {
  id             String   @id @default(cuid())
  usuarioId      String   @unique
  nombreCompleto String
  telefono       String?
  creadoEn       DateTime @default(now())

  usuario              Usuario      @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  direcciones          Direccion[]
  carrito              Carrito?
  ordenesComoComprador Orden[]      @relation("OrdenesComprador")
  valoracionesHechas   Valoracion[] @relation("ValoracionesComprador")
  favoritos            Favorito[]
  conversaciones       Conversacion[]

  @@map("perfiles_comprador")
}

// NUEVA: Gestión de direcciones de envío
// Por qué: La tabla perfiles_comprador solo tenía UNA dirección.
// Un comprador puede tener casa, trabajo, casa de un familiar.
// Además, la orden debe guardar un SNAPSHOT de la dirección para
// que si el comprador cambia su dirección, la orden histórica
// siga mostrando la dirección correcta donde se entregó.
model Direccion {
  id          String   @id @default(cuid())
  compradorId String
  alias       String   // "Casa", "Trabajo", "Casa de mamá"
  destinatario String  // nombre de quien recibe (puede ser distinto al comprador)
  calle       String
  zona        String?
  ciudad      String   @default("Santa Cruz")
  departamento String  @default("Santa Cruz")
  referencia  String?  // "Frente al mercado Los Pozos, portón verde"
  esPrincipal Boolean  @default(false)
  activo      Boolean  @default(true)

  comprador   PerfilComprador @relation(fields: [compradorId], references: [id], onDelete: Cascade)
  ordenes     Orden[]

  @@index([compradorId, esPrincipal])
  @@map("direcciones")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 2 + 3: CATÁLOGO Y BÚSQUEDA
// ══════════════════════════════════════════════════════════════

model Categoria {
  id       String  @id @default(cuid())
  nombre   String  @unique
  slug     String  @unique
  icono    String?
  padreId  String?
  orden    Int     @default(0)  // orden de aparición en el menú
  activo   Boolean @default(true)

  padre     Categoria?  @relation("Subcategorias", fields: [padreId], references: [id])
  hijos     Categoria[] @relation("Subcategorias")
  productos Producto[]

  @@map("categorias")
}

model Producto {
  id            String   @id @default(cuid())
  vendedorId    String
  categoriaId   String
  nombre        String
  descripcion   String?
  precio        Decimal  @db.Decimal(12, 4)
  stock         Int      @default(0)
  activo        Boolean  @default(true)
  destacado     Boolean  @default(false)   // admin puede destacar productos en la home
  totalVendido  Int      @default(0)       // desnormalizado: contador de unidades vendidas
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  vendedor    PerfilVendedor   @relation(fields: [vendedorId], references: [id])
  categoria   Categoria        @relation(fields: [categoriaId], references: [id])
  imagenes    ImagenProducto[]
  etiquetas   ProductoEtiqueta[]
  itemsOrden  ItemOrden[]
  itemsCarrito ItemCarrito[]
  favoritos   Favorito[]
  ofertaProductos OfertaProducto[]

  @@index([vendedorId, activo])
  @@index([categoriaId, activo])
  @@index([activo, destacado])
  @@index([precio])
  @@map("productos")
}

model ImagenProducto {
  id         String @id @default(cuid())
  productoId String
  url        String
  orden      Int    @default(0)  // 0 = imagen principal (thumbnail)

  producto   Producto @relation(fields: [productoId], references: [id], onDelete: Cascade)

  @@index([productoId, orden])
  @@map("imagenes_producto")
}

// NUEVA: Etiquetas para búsqueda enriquecida
// Por qué: Las categorías son jerárquicas y rígidas.
// Las etiquetas son flexibles: "hecho a mano", "orgánico", "oferta",
// "nuevo", "importado". Mejoran el FTS y el SEO.
model Etiqueta {
  id     String @id @default(cuid())
  nombre String @unique
  slug   String @unique

  productos ProductoEtiqueta[]

  @@map("etiquetas")
}

// Tabla de unión N:M entre Producto y Etiqueta
model ProductoEtiqueta {
  productoId String
  etiquetaId String

  producto   Producto @relation(fields: [productoId], references: [id], onDelete: Cascade)
  etiqueta   Etiqueta @relation(fields: [etiquetaId], references: [id], onDelete: Cascade)

  @@id([productoId, etiquetaId])
  @@map("producto_etiquetas")
}

// NUEVA: Lista de deseos del comprador
// Por qué: Los compradores marcan productos para comprar después.
// Genera retención y datos valiosos de demanda para el vendedor.
model Favorito {
  id          String   @id @default(cuid())
  compradorId String
  productoId  String
  creadoEn    DateTime @default(now())

  comprador   PerfilComprador @relation(fields: [compradorId], references: [id], onDelete: Cascade)
  producto    Producto        @relation(fields: [productoId], references: [id], onDelete: Cascade)

  @@unique([compradorId, productoId])  // un favorito por par comprador-producto
  @@map("favoritos")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 4 — CARRITO (NUEVO — CRÍTICO)
// ══════════════════════════════════════════════════════════════

// Por qué es su propio módulo:
// El carrito tiene su propio ciclo de vida independiente de la orden.
// Existe ANTES de que se decida pagar. Puede abandonarse, modificarse,
// vaciarse. La orden existe DESPUÉS del pago confirmado.

model Carrito {
  id          String   @id @default(cuid())
  compradorId String   @unique   // un carrito activo por comprador
  actualizadoEn DateTime @updatedAt
  creadoEn    DateTime @default(now())

  comprador   PerfilComprador @relation(fields: [compradorId], references: [id], onDelete: Cascade)
  items       ItemCarrito[]

  @@map("carritos")
}

model ItemCarrito {
  id             String   @id @default(cuid())
  carritoId      String
  productoId     String
  cantidad       Int
  // Precio en el momento de agregar al carrito.
  // Si el vendedor cambia el precio, se notifica al comprador
  // pero NO se actualiza automáticamente (decisión de negocio).
  precioSnapshot Decimal  @db.Decimal(12, 4)
  agregadoEn     DateTime @default(now())

  carrito  Carrito  @relation(fields: [carritoId], references: [id], onDelete: Cascade)
  producto Producto @relation(fields: [productoId], references: [id])

  @@unique([carritoId, productoId])  // un item por producto en el carrito
  @@map("items_carrito")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 5: OFERTAS Y CUPONES (AMPLIADO)
// ══════════════════════════════════════════════════════════════

model Oferta {
  id          String       @id @default(cuid())
  vendedorId  String
  titulo      String
  descripcion String?
  descuento   Decimal      @db.Decimal(5, 2)   // porcentaje: 1.00 a 100.00
  fechaInicio DateTime
  fechaFin    DateTime
  estado      EstadoOferta @default(PROGRAMADA)
  creadoEn    DateTime     @default(now())

  vendedor  PerfilVendedor   @relation(fields: [vendedorId], references: [id])
  productos OfertaProducto[] // relación a productos específicos

  @@index([vendedorId, estado])
  @@index([fechaFin, estado])  // usado por el cron de vencimiento
  @@map("ofertas")
}

// NUEVA: Relación N:M Oferta ↔ Producto
// Por qué: Una oferta puede aplicar a PRODUCTOS ESPECÍFICOS del vendedor,
// no a todo su catálogo. Ejemplo: "20% en zapatillas Nike" (solo ese producto).
model OfertaProducto {
  ofertaId   String
  productoId String

  oferta   Oferta   @relation(fields: [ofertaId], references: [id], onDelete: Cascade)
  producto Producto @relation(fields: [productoId], references: [id])

  @@id([ofertaId, productoId])
  @@map("oferta_productos")
}

// NUEVA: Sistema de cupones de descuento
// Por qué: Los cupones son una herramienta de marketing estándar
// en cualquier marketplace. "NEXCOM10" → 10% de descuento.
// Pueden ser para nuevos usuarios, para un vendedor específico, o globales.
model Cupon {
  id          String   @id @default(cuid())
  codigo      String   @unique  // "NEXCOM10", "VERANO2026"
  tipo        String   // "PORCENTAJE" | "MONTO_FIJO"
  valor       Decimal  @db.Decimal(10, 4)
  montoMinimo Decimal? @db.Decimal(12, 4)  // monto mínimo de compra para aplicar
  maxUsos     Int?     // null = usos ilimitados
  usosActuales Int     @default(0)
  vendedorId  String?  // null = cupón global de la plataforma
  fechaInicio DateTime
  fechaFin    DateTime
  activo      Boolean  @default(true)
  creadoEn    DateTime @default(now())

  usos        UsoCupon[]

  @@index([codigo, activo])
  @@map("cupones")
}

// NUEVA: Registro de uso de cupones (previene doble uso)
model UsoCupon {
  id         String   @id @default(cuid())
  cuponId    String
  ordenId    String   @unique  // un uso por orden
  usuarioId  String
  descuento  Decimal  @db.Decimal(12, 4)  // monto exacto descontado
  creadoEn   DateTime @default(now())

  cupon      Cupon    @relation(fields: [cuponId], references: [id])

  @@index([cuponId, usuarioId])  // verificar si usuario ya usó el cupón
  @@map("usos_cupon")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 6: ÓRDENES (AMPLIADO)
// ══════════════════════════════════════════════════════════════

model Orden {
  id                    String      @id @default(cuid())
  compradorId           String
  vendedorId            String
  direccionId           String?     // FK a la dirección elegida
  estado                EstadoOrden @default(PENDIENTE_PAGO)
  subtotal              Decimal     @db.Decimal(12, 4)
  descuentoCupon        Decimal     @default(0) @db.Decimal(12, 4)
  total                 Decimal     @db.Decimal(12, 4)
  stripePaymentIntentId String?     @unique
  comprobanteUrl        String?
  notas                 String?
  // SNAPSHOT de la dirección al momento de la compra
  // (se serializa como JSON para que sea inmutable en el tiempo)
  direccionSnapshot     Json?
  creadoEn              DateTime    @default(now())
  actualizadoEn         DateTime    @updatedAt

  comprador      PerfilComprador       @relation("OrdenesComprador", fields: [compradorId], references: [id])
  vendedor       PerfilVendedor        @relation("OrdenesVendedor", fields: [vendedorId], references: [id])
  direccion      Direccion?            @relation(fields: [direccionId], references: [id])
  items          ItemOrden[]
  pago           Pago?
  valoracion     Valoracion?
  historialEstados HistorialEstadoOrden[]
  notificaciones Notificacion[]
  usoCupon       UsoCupon?

  @@index([compradorId, estado])
  @@index([vendedorId, estado])
  @@index([estado, creadoEn])
  @@map("ordenes")
}

model ItemOrden {
  id             String  @id @default(cuid())
  ordenId        String
  productoId     String
  // Nombre y precio guardados en el momento de la compra (histórico inmutable)
  nombreSnapshot String
  cantidad       Int
  precioUnitario Decimal @db.Decimal(12, 4)
  subtotal       Decimal @db.Decimal(12, 4)

  orden    Orden    @relation(fields: [ordenId], references: [id], onDelete: Cascade)
  producto Producto @relation(fields: [productoId], references: [id])

  @@map("items_orden")
}

// NUEVA: Auditoría completa de cambios de estado de la orden
// Por qué: Sin esto, si hay un reclamo ("yo nunca marqué enviado"),
// no hay evidencia. Cada cambio de estado queda registrado con:
// quién lo hizo, cuándo, desde qué estado venía.
model HistorialEstadoOrden {
  id              String      @id @default(cuid())
  ordenId         String
  estadoAnterior  EstadoOrden?   // null si es la creación inicial
  estadoNuevo     EstadoOrden
  cambiadoPorId   String         // usuario que hizo el cambio
  notas           String?        // razón del cambio (ej. "cancelado por falta de stock")
  creadoEn        DateTime    @default(now())

  orden           Orden       @relation(fields: [ordenId], references: [id], onDelete: Cascade)

  @@index([ordenId, creadoEn])
  @@map("historial_estados_orden")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 7: PAGOS
// ══════════════════════════════════════════════════════════════

model Pago {
  id             String     @id @default(cuid())
  ordenId        String     @unique
  monto          Decimal    @db.Decimal(12, 4)
  moneda         String     @default("USD")
  metodo         String     // "card" | "qr"
  stripeChargeId String?
  estado         EstadoPago @default(PENDIENTE)
  creadoEn       DateTime   @default(now())

  orden Orden @relation(fields: [ordenId], references: [id])

  @@map("pagos")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 8: VALORACIONES (AMPLIADO)
// ══════════════════════════════════════════════════════════════

model Valoracion {
  id           String   @id @default(cuid())
  ordenId      String   @unique
  compradorId  String
  vendedorId   String
  calificacion Int      // 1 a 5 (enforced por CHECK constraint en DB)
  comentario   String?
  creadoEn     DateTime @default(now())

  orden     Orden           @relation(fields: [ordenId], references: [id])
  comprador PerfilComprador @relation("ValoracionesComprador", fields: [compradorId], references: [id])
  vendedor  PerfilVendedor  @relation("ValoracionesVendedor", fields: [vendedorId], references: [id])
  respuesta RespuestaValoracion?
  reportes  Reporte[]       @relation("ReportesValoracion")

  @@index([vendedorId, calificacion])
  @@map("valoraciones")
}

// NUEVA: Respuesta del vendedor a una valoración
// Por qué: En todos los marketplaces serios (Amazon, Booking, Google)
// el vendedor puede responder públicamente a una reseña.
// Esto humaniza el negocio y permite aclaraciones ante malas reseñas injustas.
model RespuestaValoracion {
  id           String   @id @default(cuid())
  valoracionId String   @unique  // solo una respuesta por valoración
  vendedorId   String
  respuesta    String
  creadoEn     DateTime @default(now())

  valoracion   Valoracion @relation(fields: [valoracionId], references: [id], onDelete: Cascade)

  @@map("respuestas_valoracion")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 9 — MENSAJERÍA (FUTURO — Post-MVP)
// ══════════════════════════════════════════════════════════════

// Por qué diseñarlo ahora aunque no se implemente aún:
// Si la tabla ordenes o productos referenciara mensajes directamente,
// sería muy difícil desacoplarlos después.
// Diseñarlo bien desde el schema previene una migración costosa en el futuro.

model Conversacion {
  id          String   @id @default(cuid())
  compradorId String
  vendedorId  String
  productoId  String?  // sobre qué producto es la conversación (nullable: puede ser general)
  activo      Boolean  @default(true)
  creadoEn    DateTime @default(now())

  comprador PerfilComprador @relation(fields: [compradorId], references: [id])
  vendedor  PerfilVendedor  @relation(fields: [vendedorId], references: [id])
  mensajes  Mensaje[]

  @@unique([compradorId, vendedorId, productoId])
  @@map("conversaciones")
}

model Mensaje {
  id             String   @id @default(cuid())
  conversacionId String
  emisorId       String   // usuarioId del emisor
  contenido      String
  leido          Boolean  @default(false)
  creadoEn       DateTime @default(now())

  conversacion   Conversacion @relation(fields: [conversacionId], references: [id], onDelete: Cascade)

  @@index([conversacionId, creadoEn])
  @@index([conversacionId, leido])
  @@map("mensajes")
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 10: REPORTES Y MODERACIÓN (NUEVO)
// ══════════════════════════════════════════════════════════════

// Por qué es un módulo independiente y no parte del Admin:
// El Admin panel MUESTRA datos. La Moderación ACTÚA sobre datos.
// Son responsabilidades distintas. Un moderador no necesita
// ser administrador completo del sistema.

model Reporte {
  id             String        @id @default(cuid())
  reportadorId   String
  tipo           TipoReporte
  referenciaId   String        // ID del producto, vendedor, valoración, etc. reportado
  motivo         String        // "CONTENIDO_INAPROPIADO" | "FRAUDE" | "SPAM" | "PRODUCTO_FALSO"
  descripcion    String?       // detalles del reporte
  estado         EstadoReporte @default(PENDIENTE)
  resueltoPorId  String?       // admin que lo resolvió
  resolucion     String?       // notas de la resolución
  creadoEn       DateTime      @default(now())
  resueltoeEn    DateTime?

  reportador     Usuario       @relation("ReportesHechos", fields: [reportadorId], references: [id])
  resueltoPor    Usuario?      @relation("ReportesResueltos", fields: [resueltoPorId], references: [id])
  valoracion     Valoracion?   @relation("ReportesValoracion", fields: [referenciaId], references: [id], map: "fk_reporte_valoracion")

  @@index([tipo, estado])
  @@index([reportadorId])
  @@map("reportes")
}

// NUEVA: Configuración dinámica del sistema sin redesplegar
// Por qué: Parámetros como porcentaje de comisión, máximo de imágenes
// por producto, email de soporte, o si los cupones están habilitados,
// no deben estar hardcodeados en el código. El admin los modifica
// desde el panel sin tocar el código ni reiniciar el servidor.
model ConfiguracionSistema {
  clave        String   @id    // "comision_porcentaje", "max_imagenes_producto"
  valor        String          // siempre string, se castea según `tipo`
  tipo         String          // "NUMBER" | "STRING" | "BOOLEAN" | "JSON"
  descripcion  String          // documentación para el admin
  actualizadoEn DateTime @updatedAt

  @@map("configuracion_sistema")
}

// ══════════════════════════════════════════════════════════════
// SISTEMA TRANSVERSAL: NOTIFICACIONES
// ══════════════════════════════════════════════════════════════

model Notificacion {
  id        String   @id @default(cuid())
  usuarioId String
  ordenId   String?
  tipo      String
  titulo    String   // corto: "Nueva orden recibida"
  mensaje   String   // detalle: "El comprador Juan compró 2 unidades de..."
  leido     Boolean  @default(false)
  url       String?  // link de acción: "/vendedor/ordenes/ord_xyz"
  creadoEn  DateTime @default(now())

  usuario   Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  orden     Orden?  @relation(fields: [ordenId], references: [id])

  @@index([usuarioId, leido])
  @@index([creadoEn])
  @@map("notificaciones")
}
```

---

## DIAGRAMA DE RELACIONES COMPLETO — v2.0

```
USUARIOS (supertipo)
    │
    ├─▓─► PERFILES_VENDEDOR (1:1 composición)
    │           │
    │           ├─▓─► PRODUCTOS (1:N composición)
    │           │         │
    │           │         ├─▓─► IMAGENES_PRODUCTO (1:N composición)
    │           │         ├──── PRODUCTO_ETIQUETAS (N:M asociación)
    │           │         ├──── OFERTA_PRODUCTOS   (N:M asociación)
    │           │         ├──── ITEMS_ORDEN        (1:N asociación, histórico)
    │           │         ├──── ITEMS_CARRITO      (1:N asociación)
    │           │         └──── FAVORITOS          (N:M asociación)
    │           │
    │           ├─▓─► OFERTAS (1:N composición)
    │           │         └──── OFERTA_PRODUCTOS (N:M)
    │           │
    │           ├──── ORDENES como vendedor (1:N asociación)
    │           ├──── VALORACIONES recibidas (1:N asociación)
    │           └──── CONVERSACIONES (1:N)
    │
    ├─▓─► PERFILES_COMPRADOR (1:1 composición)
    │           │
    │           ├─▓─► DIRECCIONES (1:N composición)
    │           ├─▓─► CARRITO (1:1 composición)
    │           │         └─▓─► ITEMS_CARRITO (1:N composición)
    │           ├──── ORDENES como comprador (1:N asociación)
    │           ├──── VALORACIONES hechas (1:N asociación)
    │           ├──── FAVORITOS (1:N)
    │           └──── CONVERSACIONES (1:N)
    │
    ├─▓─► TOKENS_VERIFICACION (1:N composición)
    ├─▓─► REFRESH_TOKENS (1:N composición)
    ├─▓─► NOTIFICACIONES (1:N composición)
    └──── REPORTES hechos / resueltos (1:N asociación)

ORDENES
    ├─▓─► ITEMS_ORDEN (1:N composición)
    ├─▓─► PAGO (1:1 composición)
    ├─▓─► HISTORIAL_ESTADOS_ORDEN (1:N composición)
    └──── VALORACION (1:1 composición débil)
              └──── RESPUESTA_VALORACION (1:1 composición)

ETIQUETAS
    └──── PRODUCTO_ETIQUETAS (N:M con PRODUCTOS)

CUPONES
    └─▓─► USOS_CUPON (1:N composición)

CATEGORIAS
    ├──── CATEGORIAS (auto-referencia: padre → hijos)
    └──── PRODUCTOS (1:N agregación)

CONVERSACIONES
    └─▓─► MENSAJES (1:N composición)

CONFIGURACION_SISTEMA (entidad independiente, no tiene relaciones)
REPORTES (asociación con cualquier entidad via referenciaId + tipo)
```

---

## CONSTRAINTS DE INTEGRIDAD — SQL COMPLETO

```sql
-- PRODUCTOS
ALTER TABLE productos
  ADD CONSTRAINT chk_precio_positivo    CHECK (precio > 0),
  ADD CONSTRAINT chk_stock_no_negativo  CHECK (stock >= 0),
  ADD CONSTRAINT chk_total_vendido      CHECK (total_vendido >= 0);

-- VALORACIONES
ALTER TABLE valoraciones
  ADD CONSTRAINT chk_calificacion_rango CHECK (calificacion BETWEEN 1 AND 5);

-- OFERTAS
ALTER TABLE ofertas
  ADD CONSTRAINT chk_descuento_rango    CHECK (descuento > 0 AND descuento <= 100),
  ADD CONSTRAINT chk_fechas_oferta      CHECK (fecha_fin > fecha_inicio);

-- ITEMS DE ORDEN Y CARRITO
ALTER TABLE items_orden
  ADD CONSTRAINT chk_cantidad_orden     CHECK (cantidad > 0),
  ADD CONSTRAINT chk_precio_unitario    CHECK (precio_unitario > 0);

ALTER TABLE items_carrito
  ADD CONSTRAINT chk_cantidad_carrito   CHECK (cantidad > 0);

-- CUPONES
ALTER TABLE cupones
  ADD CONSTRAINT chk_valor_cupon        CHECK (valor > 0),
  ADD CONSTRAINT chk_fechas_cupon       CHECK (fecha_fin > fecha_inicio);

-- ÍNDICE FULL-TEXT SEARCH EN ESPAÑOL
CREATE INDEX idx_productos_fts ON productos
  USING gin(
    to_tsvector('spanish',
      nombre || ' ' ||
      coalesce(descripcion, '') || ' '
    )
  );

-- DATOS INICIALES DE CONFIGURACIÓN
INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion) VALUES
  ('comision_porcentaje',     '0',     'NUMBER',  'Porcentaje de comisión que cobra NexCom por transacción'),
  ('max_imagenes_producto',   '5',     'NUMBER',  'Máximo de imágenes por producto'),
  ('max_productos_vendedor',  '100',   'NUMBER',  'Máximo de productos por vendedor en plan básico'),
  ('cupones_habilitados',     'true',  'BOOLEAN', 'Si el sistema de cupones está activo'),
  ('email_soporte',           'soporte@nexcom.bo', 'STRING', 'Email de soporte al usuario'),
  ('dias_auto_completar_orden','2',    'NUMBER',  'Días desde ENTREGADO para auto-completar la orden'),
  ('ttl_carrito_horas',       '72',   'NUMBER',  'Horas de vida del carrito sin actividad');
```

---

## RESUMEN FINAL

| Métrica | v1.0 | v2.0 | Diferencia |
|---|---|---|---|
| Total tablas | 13 | 29 | +16 tablas |
| Tablas de unión N:M | 0 | 3 | +3 |
| Módulos de negocio | 8 | 10 activos + 1 futuro | +2 activos |
| Enums | 4 | 5 | +1 |
| Flujo carrito-compra | ✗ Roto | ✓ Completo | CRÍTICO |
| Historial de estados | ✗ No existía | ✓ Auditado | CRÍTICO |
| Gestión de sesiones | ✗ Sin refresh | ✓ Refresh tokens | CRÍTICO |
| Direcciones de envío | ✗ Solo una | ✓ Múltiples + snapshot | CRÍTICO |
| Ofertas por producto | ✗ Solo por vendedor | ✓ Por productos específicos | IMPORTANTE |
| Cupones de descuento | ✗ No existía | ✓ Completo | IMPORTANTE |
| Respuestas a reseñas | ✗ No existía | ✓ Implementado | IMPORTANTE |
| Moderación/Reportes | ✗ Implícita | ✓ Tabla dedicada | IMPORTANTE |
| Config del sistema | ✗ Hardcodeada | ✓ Dinámica en DB | IMPORTANTE |
| Mensajería | ✗ No existía | ✓ Diseñada (post-MVP) | FUTURA |
| Favoritos | ✗ No existía | ✓ Implementado | IMPORTANTE |

---

*NexCom DATABASE v2.0 — Mayo 2026 | UAGRM, Santa Cruz, Bolivia*
