# PLAN DE DESARROLLO — NEXCOM
> Marketplace boliviano para microempresas | UAGRM Santa Cruz, Bolivia
> 5 Sprints × 2 semanas | Mayo–Agosto 2026 | 5 personas

---

## ESTADO ACTUAL — BASELINE (Semana 0 completada ✓)

### Backend — Infraestructura lista
| Archivo | Estado | Descripción |
|---|---|---|
| `backend/src/index.ts` | ✓ | Fastify + GraphQL Yoga + Stripe wired |
| `backend/src/config/env.ts` | ✓ | Variables de entorno tipadas con Zod |
| `backend/src/plugins/cors.plugin.ts` | ✓ | CORS configurado |
| `backend/src/plugins/auth.plugin.ts` | ✓ | Middleware JWT → `req.user` |
| `backend/src/shared/prisma.client.ts` | ✓ | PrismaClient con adapter-pg (Prisma 7) |
| `backend/src/shared/redis.client.ts` | ✓ | ioredis configurado |
| `backend/src/shared/jwt.util.ts` | ✓ | signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken |
| `backend/src/shared/decimal.util.ts` | ✓ | Utilidades para precios con Decimal.js |
| `backend/src/shared/cache.util.ts` | ✓ | Helpers de Redis cache |
| `backend/src/shared/types/context.type.ts` | ✓ | NexComContext, UsuarioJWT |
| `backend/src/graphql/schema.ts` | ✓ | Base schema (solo `ping`) |
| `backend/src/graphql/resolvers.ts` | ✓ | Base resolver (solo `ping`) |
| `backend/prisma/schema.prisma` | ✓ | 29 tablas, 5 enums — validado y migrado |
| `backend/prisma.config.ts` | ✓ | Config CLI de Prisma 7 |

### Base de datos — Migraciones aplicadas
- `20260524_init` → esquema inicial (28 tablas base)
- `20260524222532_fix_reporte_polymorphic_fk` → eliminada FK inválida en `reportes`

### Frontend — No iniciado aún
- Directorio `frontend/` no existe todavía

### Regla de arquitectura obligatoria (todos los sprints)
```
GraphQL Request
    └── Resolver  → valida input GraphQL, extrae ctx, llama al Service
         └── Service  → lógica de negocio, reglas, orquesta
              └── Repository  → acceso a Prisma/Redis, sin lógica de negocio
                   └── Prisma / Redis / Stripe
```
Los resolvers NUNCA tocan `ctx.prisma` o `ctx.redis` directamente.

---

## SPRINT 1 — Auth + Roles + JWT
> Duración: Semanas 1–2 | Prioridad: CRÍTICA | Desbloquea todos los demás sprints

### Objetivo del Sprint
Usuario puede registrarse, verificar su correo, iniciar sesión, renovar el token y
cerrar sesión. El sistema distingue los 3 roles (ADMIN, VENDEDOR, COMPRADOR)
desde el primer request.

---

### Tareas Backend — Sprint 1

#### 1.1 Estructura de módulo Auth
Crear el directorio `backend/src/modules/auth/` con los 4 archivos de capa:

**`auth.typedefs.ts`** — Tipos y operaciones GraphQL
```
Types a definir:
  - AuthPayload { accessToken, refreshToken, usuario }
  - UsuarioPublico { id, email, rol, verificado, creadoEn }

Mutations a definir:
  - register(email, password, rol, datosVendedor?, datosComprador?) → AuthPayload
  - login(email, password) → AuthPayload
  - logout → Boolean
  - refreshToken(refreshToken) → AuthPayload
  - verifyEmail(token) → Boolean
  - requestPasswordReset(email) → Boolean
  - resetPassword(token, nuevaPassword) → Boolean
  - updatePassword(passwordActual, nuevaPassword) → Boolean

Queries a definir:
  - me → UsuarioPublico
```

**`auth.repository.ts`** — Acceso a datos
```
Funciones a implementar:
  - findUsuarioByEmail(email, prisma)
  - findUsuarioById(id, prisma)
  - createUsuarioConPerfil(data, prisma)  ← usa transaction
  - findTokenVerificacion(token, tipo, prisma)
  - markTokenUsado(id, prisma)
  - createTokenVerificacion(data, prisma)
  - saveRefreshToken(data, prisma)
  - findRefreshTokenByHash(hash, prisma)
  - revokeRefreshToken(id, prisma)
  - revokeAllRefreshTokensUsuario(usuarioId, prisma)
  - updatePasswordHash(usuarioId, hash, prisma)
  - markUsuarioVerificado(usuarioId, prisma)
```

**`auth.service.ts`** — Lógica de negocio
```
Reglas a implementar:
  - register:
      · validar email no duplicado
      · bcrypt.hash(password, 12)
      · crear Usuario + PerfilVendedor o PerfilComprador en una transacción
      · generar token de verificación de email (24h de vida)
      · enviar email de verificación (nodemailer)
      · retornar accessToken + refreshToken
  - login:
      · verificar email existe
      · bcrypt.compare
      · verificar que usuario está activo
      · generar accessToken (15min) + refreshToken (7 días)
      · guardar hash del refreshToken en DB
  - logout:
      · revocar refreshToken actual del dispositivo
  - refreshToken:
      · verificar que el refreshToken existe y no está revocado
      · verificar que no expiró
      · generar nuevo par de tokens (rotación)
      · revocar el token anterior
  - verifyEmail:
      · buscar token activo y no vencido
      · marcar usuario como verificado
      · marcar token como usado
  - requestPasswordReset:
      · si email existe: crear token de reset (2h de vida)
      · enviar email (siempre responder OK — no revelar si email existe)
  - resetPassword:
      · verificar token válido y no vencido
      · bcrypt.hash nueva contraseña
      · revocar TODOS los refreshTokens del usuario (cierre de sesiones)
```

**`auth.resolver.ts`** — Entrada GraphQL
```
Mapear cada Mutation al Service correspondiente.
Validar que los campos requeridos lleguen.
Extraer user de ctx para operaciones autenticadas (me, logout, updatePassword).
Lanzar GraphQLError con códigos apropiados:
  - UNAUTHENTICATED → operaciones que requieren login
  - FORBIDDEN → rol incorrecto
  - BAD_USER_INPUT → validaciones de negocio
```

#### 1.2 Integración en schema base
- Importar `authTypeDefs` en `backend/src/graphql/schema.ts`
- Importar `authResolvers` en `backend/src/graphql/resolvers.ts`
- Usar `mergeTypeDefs` + `mergeResolvers` de `@graphql-tools/merge`

#### 1.3 Guards de autorización (helper reutilizable)
Crear `backend/src/shared/guards.ts`:
```
- requireAuth(ctx) → UsuarioJWT (lanza UNAUTHENTICATED si no hay user)
- requireRole(ctx, ...roles) → UsuarioJWT (lanza FORBIDDEN si rol no coincide)
```

#### 1.4 Email con Nodemailer
Crear `backend/src/shared/mailer.ts`:
```
- sendVerificationEmail(to, token)
- sendPasswordResetEmail(to, token)
Usar Ethereal (https://ethereal.email) en desarrollo — captura emails sin enviarlos
```

#### 1.5 Validaciones de Entrada con Zod
Crear `backend/src/modules/auth/auth.validators.ts`:
```
- registerSchema: email válido, password mínimo 8 chars, rol válido
- passwordSchema: longitud mínima, al menos 1 número
```

#### 1.6 Constraints SQL adicionales
Aplicar en una migración manual (`prisma migrate dev`):
```sql
-- Estas constraints no se pueden expresar en Prisma schema:
-- Se aplican via SQL raw en la migración
ALTER TABLE valoraciones ADD CONSTRAINT chk_calificacion CHECK (calificacion BETWEEN 1 AND 5);
ALTER TABLE productos ADD CONSTRAINT chk_precio CHECK (precio > 0);
ALTER TABLE productos ADD CONSTRAINT chk_stock CHECK (stock >= 0);
ALTER TABLE ofertas ADD CONSTRAINT chk_descuento CHECK (descuento > 0 AND descuento <= 100);
ALTER TABLE ofertas ADD CONSTRAINT chk_fechas_oferta CHECK (fecha_fin > fecha_inicio);
ALTER TABLE items_orden ADD CONSTRAINT chk_cantidad_orden CHECK (cantidad > 0);
ALTER TABLE items_carrito ADD CONSTRAINT chk_cantidad_carrito CHECK (cantidad > 0);
ALTER TABLE cupones ADD CONSTRAINT chk_valor_cupon CHECK (valor > 0);
ALTER TABLE cupones ADD CONSTRAINT chk_fechas_cupon CHECK (fecha_fin > fecha_inicio);

-- Full-Text Search en español
CREATE INDEX idx_productos_fts ON productos
  USING gin(to_tsvector('spanish', nombre || ' ' || coalesce(descripcion, '')));

-- Datos iniciales del sistema
INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion) VALUES
  ('comision_porcentaje',      '0',                'NUMBER',  'Comisión NexCom por transacción'),
  ('max_imagenes_producto',    '5',                'NUMBER',  'Máximo imágenes por producto'),
  ('max_productos_vendedor',   '100',              'NUMBER',  'Máximo productos por vendedor'),
  ('cupones_habilitados',      'true',             'BOOLEAN', 'Sistema de cupones activo'),
  ('email_soporte',            'soporte@nexcom.bo','STRING',  'Email de soporte'),
  ('dias_auto_completar_orden','2',                'NUMBER',  'Días desde ENTREGADO para auto-completar'),
  ('ttl_carrito_horas',        '72',               'NUMBER',  'Horas de vida del carrito sin actividad');
```

---

### Tareas Frontend — Sprint 1

#### 1.7 Crear proyecto Next.js
```bash
pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
pnpm add @apollo/client graphql
pnpm add react-hook-form zod @hookform/resolvers
pnpm add lucide-react clsx tailwind-merge sonner
```

#### 1.8 Configurar Apollo Client
Crear `frontend/src/lib/apollo-client.ts`:
```
ApolloClient con:
  - httpLink → http://localhost:4000/graphql
  - authLink → inyecta Authorization: Bearer {token} desde localStorage
  - InMemoryCache
Crear ApolloProvider en layout.tsx raíz
```

#### 1.9 Gestión de sesión (AuthContext)
Crear `frontend/src/context/auth-context.tsx`:
```
- Estado: user (id, rol) | null, isLoading
- Funciones: login(), logout(), refreshIfNeeded()
- Persiste accessToken en localStorage, refreshToken en cookie httpOnly
- Auto-refresh del accessToken antes de que expire (cada 14 min)
```

#### 1.10 Páginas de autenticación
```
frontend/src/app/
  ├── (auth)/
  │   ├── login/page.tsx          ← formulario email + password
  │   ├── registro/page.tsx       ← formulario con selector de rol
  │   ├── verificar-email/page.tsx ← pantalla de confirmación con token URL
  │   ├── recuperar-password/page.tsx
  │   └── nueva-password/page.tsx
  └── layout.tsx (raíz)
```

#### 1.11 Rutas protegidas
Crear `frontend/src/middleware.ts`:
```
- Rutas /vendedor/* → requiere rol VENDEDOR o ADMIN
- Rutas /admin/* → requiere rol ADMIN
- /comprador/* → requiere rol COMPRADOR o ADMIN
- Redirige a /login si no hay sesión
```

#### 1.12 Operaciones GraphQL Auth
Crear `frontend/src/graphql/auth/`:
```
  mutations.ts → REGISTER, LOGIN, LOGOUT, REFRESH_TOKEN,
                  VERIFY_EMAIL, REQUEST_PASSWORD_RESET, RESET_PASSWORD
  queries.ts   → ME
```

---

### Criterios de Aceptación — Sprint 1
- [ ] Un usuario puede registrarse como COMPRADOR o VENDEDOR
- [ ] El email de verificación llega (capturado en Ethereal en dev)
- [ ] Solo se puede hacer login con cuenta verificada
- [ ] El accessToken expira a los 15min; el refreshToken renueva la sesión
- [ ] Logout invalida el refreshToken en DB
- [ ] Rutas protegidas redirigen al login si no hay sesión
- [ ] `tsc --noEmit` sin errores en backend y frontend
- [ ] Query `{ ping }` en GraphiQL retorna el user autenticado si hay token

---

## SPRINT 2 — Catálogo + Búsqueda + Carrito
> Duración: Semanas 3–4 | Desbloquea: Ofertas, Pagos

### Objetivo del Sprint
El vendedor puede publicar y gestionar su catálogo de productos con imágenes,
categorías y etiquetas. El comprador puede buscar, filtrar, guardar favoritos
y agregar al carrito.

---

### Tareas Backend — Sprint 2

#### 2.1 Módulo Categorías
`backend/src/modules/categorias/`
```
typedefs:
  - Categoria { id, nombre, slug, icono, padre, hijos, activo }
  - Query: categorias(soloRaices?) → [Categoria]
  - Query: categoria(slug) → Categoria
  - Mutation: crearCategoria(input) → ADMIN only
  - Mutation: actualizarCategoria(id, input) → ADMIN only

repository:
  - findAllCategorias(soloRaices, prisma)
  - findCategoriaBySlug(slug, prisma)
  - createCategoria(data, prisma)
  - updateCategoria(id, data, prisma)

service: validar unicidad de slug, árbol de categorías válido
```

#### 2.2 Módulo Productos
`backend/src/modules/productos/`
```
typedefs:
  - Producto { id, nombre, descripcion, precio, stock, imagenes, etiquetas,
               categoria, vendedor, activo, destacado, totalVendido }
  - ProductoInput { nombre, descripcion, precio, stock, categoriaId, etiquetas[] }
  - Query: productos(filtros?) → PaginatedProductos
  - Query: producto(id) → Producto
  - Query: misProductos → [Producto]  ← VENDEDOR only
  - Mutation: crearProducto(input) → VENDEDOR
  - Mutation: actualizarProducto(id, input) → VENDEDOR (solo propios)
  - Mutation: eliminarProducto(id) → soft delete — VENDEDOR (solo propios)
  - Mutation: toggleDestacado(id) → ADMIN

repository:
  - createProducto(data, prisma)  ← incluye imagenes y etiquetas en transacción
  - findProductoById(id, prisma)
  - findProductosByVendedor(vendedorId, prisma)
  - updateProducto(id, data, prisma)
  - softDeleteProducto(id, prisma)  ← activo: false
  - addImagenes(productoId, urls[], prisma)
  - removeImagen(imagenId, prisma)

service:
  - Validar que el vendedor es el dueño antes de editar/borrar
  - Verificar maxProductos desde ConfiguracionSistema
  - Verificar maxImagenes desde ConfiguracionSistema
  - Verificar que precio > 0 y stock >= 0
```

#### 2.3 Módulo Búsqueda y Filtros
`backend/src/modules/busqueda/`
```
typedefs:
  - FiltrosBusqueda { query?, categoriaId?, precioMin?, precioMax?,
                      vendedorId?, soloConStock?, etiquetas?, orden? }
  - ResultadoBusqueda { productos, total, pagina, totalPaginas }
  - Query: buscarProductos(filtros, pagina, limite) → ResultadoBusqueda

repository:
  - searchProductos(filtros, pagina, limite, prisma)
    Implementación:
      · Si query presente → usar to_tsvector FTS en español
      · Filtrar por categoriaId (incluyendo subcategorías recursivas)
      · Filtrar por rango de precio
      · Filtrar por etiquetas (array overlap)
      · Ordenar por: relevancia FTS | precio_asc | precio_desc | mas_vendido | nuevo
      · Paginar con OFFSET/LIMIT

Cache en Redis:
  - Key: "busqueda:{hash(filtros)}"
  - TTL: 5 minutos
  - Invalidar cuando: producto creado, precio cambiado, stock cambiado
```

#### 2.4 Módulo Etiquetas
`backend/src/modules/etiquetas/`
```
typedefs:
  - Etiqueta { id, nombre, slug }
  - Query: etiquetas → [Etiqueta]
  - Mutation: crearEtiqueta(nombre) → ADMIN

repository:
  - findOrCreateEtiqueta(nombre, prisma)
  - findAllEtiquetas(prisma)
```

#### 2.5 Módulo Favoritos
`backend/src/modules/favoritos/`
```
typedefs:
  - Mutation: toggleFavorito(productoId) → Boolean (true=agregado, false=quitado)
  - Query: misFavoritos → [Producto]

repository:
  - findFavorito(compradorId, productoId, prisma)
  - createFavorito(data, prisma)
  - deleteFavorito(id, prisma)
  - findFavoritosByComprador(compradorId, prisma)

service: solo COMPRADOR puede tener favoritos
```

#### 2.6 Módulo Carrito
`backend/src/modules/carrito/`
```
typedefs:
  - Carrito { id, items, subtotal }
  - ItemCarrito { id, producto, cantidad, precioSnapshot, subtotalItem }
  - Query: miCarrito → Carrito
  - Mutation: agregarAlCarrito(productoId, cantidad) → Carrito
  - Mutation: actualizarCantidad(itemId, cantidad) → Carrito
  - Mutation: removerDelCarrito(itemId) → Carrito
  - Mutation: vaciarCarrito → Boolean

repository:
  - findOrCreateCarrito(compradorId, prisma)
  - findItemCarrito(carritoId, productoId, prisma)
  - upsertItemCarrito(data, prisma)
  - removeItemCarrito(itemId, prisma)
  - clearCarrito(carritoId, prisma)

service:
  - Al agregar: verificar que producto está activo y tiene stock suficiente
  - Al agregar: guardar precioSnapshot (precio actual del producto)
  - Solo COMPRADOR puede usar el carrito
  - Si producto ya está en carrito: incrementar cantidad (no duplicar)
  - Verificar stock antes de cada update de cantidad
```

---

### Tareas Frontend — Sprint 2

#### 2.7 Layout principal (shell)
```
frontend/src/app/
  ├── (main)/
  │   ├── layout.tsx  ← Navbar + Footer
  │   ├── page.tsx    ← Home: productos destacados + categorías
  │   └── ...
```

#### 2.8 Páginas del catálogo
```
  ├── productos/page.tsx          ← grid de productos con filtros laterales
  ├── productos/[id]/page.tsx     ← detalle del producto + imágenes + acciones
  ├── categoria/[slug]/page.tsx   ← productos por categoría
  └── buscar/page.tsx             ← resultados de búsqueda con filtros URL params
```

#### 2.9 Componentes del catálogo
```
frontend/src/components/
  ├── productos/
  │   ├── ProductoCard.tsx        ← tarjeta del producto (imagen, precio, stock, favorito)
  │   ├── ProductoGrid.tsx        ← grid responsivo de ProductoCards
  │   ├── ProductoDetalle.tsx     ← galería de imágenes + descripción + botón carrito
  │   └── FiltrosLaterales.tsx   ← precio range, categorías, etiquetas
  └── carrito/
      ├── CartIcon.tsx            ← ícono con contador en navbar
      ├── CartDrawer.tsx          ← panel lateral deslizante con items
      └── CartItem.tsx            ← fila de item con qty controls
```

#### 2.10 Panel del Vendedor — Gestión de Productos
```
frontend/src/app/vendedor/
  ├── layout.tsx                  ← sidebar del panel vendedor
  ├── page.tsx                    ← dashboard: stats rápidas
  ├── productos/page.tsx          ← lista de mis productos (tabla)
  ├── productos/nuevo/page.tsx    ← formulario crear producto
  └── productos/[id]/editar/page.tsx ← formulario editar producto
```

---

### Criterios de Aceptación — Sprint 2
- [ ] Vendedor puede crear producto con imágenes y etiquetas
- [ ] Vendedor puede editar y desactivar (soft delete) sus productos
- [ ] Búsqueda por texto usa FTS en español y retorna en < 500ms
- [ ] Filtros por categoría, precio, etiquetas funcionan combinados
- [ ] Comprador puede agregar/quitar favoritos
- [ ] Carrito persiste entre sesiones (guardado en DB)
- [ ] Stock se verifica al agregar al carrito
- [ ] Caché Redis invalida resultados de búsqueda al cambiar productos
- [ ] Admin puede destacar/quitar destaque de cualquier producto

---

## SPRINT 3 — Ofertas + Cupones + Stripe Sandbox
> Duración: Semanas 5–6 | Desbloquea: Órdenes, Historial

### Objetivo del Sprint
Vendedor puede publicar ofertas con vigencia. Comprador puede aplicar cupones.
El flujo completo de pago con Stripe Sandbox funciona de extremo a extremo:
carrito → dirección → pago → webhook → orden creada.

---

### Tareas Backend — Sprint 3

#### 3.1 Módulo Ofertas
`backend/src/modules/ofertas/`
```
typedefs:
  - Oferta { id, titulo, descripcion, descuento, fechaInicio, fechaFin, estado, productos }
  - Query: ofertasActivas → [Oferta]
  - Query: misOfertas → [Oferta]  ← VENDEDOR
  - Mutation: crearOferta(input) → VENDEDOR
  - Mutation: actualizarOferta(id, input) → VENDEDOR (solo propias)
  - Mutation: cancelarOferta(id) → VENDEDOR (solo propias)

repository:
  - createOferta(data, productoIds[], prisma)  ← con OfertaProducto en transacción
  - findOfertasActivas(prisma)
  - findOfertasByVendedor(vendedorId, prisma)
  - updateEstadoOferta(id, estado, prisma)

service:
  - Al crear: validar fechaFin > fechaInicio
  - Al crear: validar que los productos pertenecen al vendedor
  - Calcular estado automáticamente: PROGRAMADA → ACTIVA → VENCIDA
  - Cron job cada hora: detectar ofertas que deben cambiar de estado
    (usar setInterval en desarrollo, cron real en producción)
```

#### 3.2 Módulo Cupones
`backend/src/modules/cupones/`
```
typedefs:
  - Cupon { id, codigo, tipo, valor, montoMinimo, maxUsos, usosActuales, fechaFin }
  - Mutation: crearCupon(input) → ADMIN
  - Mutation: validarCupon(codigo, subtotal) → CuponValido | Error
  - Query: cupones → ADMIN only

repository:
  - findCuponByCodigo(codigo, prisma)
  - countUsosCupon(cuponId, usuarioId, prisma)
  - createUsoCupon(data, prisma)

service (validarCupon):
  - Verificar que el cupón existe y está activo
  - Verificar que la fecha actual está entre fechaInicio y fechaFin
  - Verificar que no se superó maxUsos
  - Verificar montoMinimo si está configurado
  - Verificar que el usuario no ha usado este cupón antes
  - Calcular descuento final (PORCENTAJE o MONTO_FIJO)
```

#### 3.3 Módulo Direcciones
`backend/src/modules/direcciones/`
```
typedefs:
  - Direccion { id, alias, destinatario, calle, zona, ciudad, referencia, esPrincipal }
  - Query: misDirecciones → [Direccion]
  - Mutation: crearDireccion(input) → COMPRADOR
  - Mutation: actualizarDireccion(id, input) → COMPRADOR
  - Mutation: eliminarDireccion(id) → COMPRADOR
  - Mutation: setPrincipal(id) → COMPRADOR

service: solo 1 dirección principal a la vez (desmarcar la anterior en transacción)
```

#### 3.4 Módulo Pagos (Stripe Sandbox)
`backend/src/modules/pagos/`
```
typedefs:
  - Mutation: crearPaymentIntent(carritoId, direccionId, cuponCodigo?) → { clientSecret, ordenId }
  - Mutation: confirmarPago(ordenId) → Orden  ← solo para fallback manual

repository:
  - createOrden(data, prisma)  ← snapshot de items, precios y dirección
  - createPago(data, prisma)
  - findOrdenById(id, prisma)
  - findOrdenByPaymentIntentId(intentId, prisma)
  - updatePagoEstado(pagoId, estado, stripeChargeId, prisma)
  - updateOrdenEstado(ordenId, estado, prisma)
  - createHistorialEstado(data, prisma)

service (crearPaymentIntent):
  - Verificar que el carrito no está vacío
  - Re-verificar stock de todos los items del carrito
  - Aplicar cupón si se provee (validarCupon)
  - Calcular subtotal, descuento, total
  - Construir snapshot de la dirección (JSON inmutable)
  - Crear Orden en estado PENDIENTE_PAGO
  - Crear Pago en estado PENDIENTE
  - Llamar stripe.paymentIntents.create({ amount, currency: 'usd', metadata: { ordenId } })
  - Actualizar stripePaymentIntentId en Orden
  - Retornar clientSecret al frontend
  - Descontar stock de productos

Webhook handler en /webhooks/stripe:
  - Verificar firma con stripe.webhooks.constructEvent
  - Manejar eventos:
      · payment_intent.succeeded:
          → Orden: PENDIENTE_PAGO → PAGADO
          → Pago: PENDIENTE → COMPLETADO
          → Guardar stripeChargeId
          → Vaciar carrito del comprador
          → Crear notificaciones (comprador: "Pago confirmado", vendedor: "Nueva orden")
          → Crear HistorialEstadoOrden
      · payment_intent.payment_failed:
          → Orden: PENDIENTE_PAGO → CANCELADO
          → Pago: PENDIENTE → FALLIDO
          → Restituir stock
```

---

### Tareas Frontend — Sprint 3

#### 3.5 Páginas de Checkout
```
frontend/src/app/checkout/
  ├── page.tsx         ← resumen del carrito + selección de dirección + cupón
  ├── pago/page.tsx    ← Stripe Elements (CardElement) + botón pagar
  └── confirmacion/page.tsx ← pantalla de éxito/error post-pago
```

#### 3.6 Componentes de Pago
```
frontend/src/components/checkout/
  ├── ResumenCarrito.tsx    ← items + subtotal + descuento + total
  ├── SelectorDireccion.tsx ← lista de direcciones + crear nueva
  ├── FormularioCupon.tsx   ← input de código + feedback de validación
  └── StripePaymentForm.tsx ← CardElement de Stripe + submit handler
```

#### 3.7 Panel Vendedor — Ofertas
```
frontend/src/app/vendedor/
  ├── ofertas/page.tsx         ← lista de mis ofertas con estado visual
  └── ofertas/nueva/page.tsx   ← formulario crear oferta + selector de productos
```

---

### Configuración Stripe Sandbox
```
1. stripe login
2. stripe listen --forward-to localhost:4000/webhooks/stripe
   → Copiar el webhook signing secret al .env (STRIPE_WEBHOOK_SECRET)
3. Usar tarjeta de prueba: 4242 4242 4242 4242 | CVC: cualquiera | Fecha: futura
```

### Criterios de Aceptación — Sprint 3
- [ ] Vendedor puede crear oferta vinculada a productos específicos
- [ ] Cron actualiza estado de ofertas vencidas automáticamente
- [ ] Comprador puede validar cupón y ver el descuento aplicado en tiempo real
- [ ] Flujo completo: carrito → dirección → cupón opcional → pago Stripe → confirmación
- [ ] Webhook recibe `payment_intent.succeeded` y actualiza Orden + Pago
- [ ] Stock se descuenta al crear orden, se restituye si el pago falla
- [ ] Comprador y Vendedor reciben notificación al completarse el pago
- [ ] Carrito se vacía automáticamente después del pago exitoso

---

## SPRINT 4 — Órdenes + Estado + Valoraciones
> Duración: Semanas 7–8 | Desbloquea: Panel Admin, QA

### Objetivo del Sprint
Vendedor gestiona sus órdenes con una máquina de estados. Comprador y vendedor
reciben notificaciones en cada cambio. Post-transacción, el comprador puede
dejar una valoración y el vendedor responder.

---

### Tareas Backend — Sprint 4

#### 4.1 Módulo Órdenes
`backend/src/modules/ordenes/`
```
typedefs:
  - Orden { id, estado, items, total, direccionSnapshot, comprador, vendedor,
            pago, valoracion, historialEstados, creadoEn }
  - Query: misOrdenes(estado?, pagina?) → PaginatedOrdenes  ← COMPRADOR
  - Query: ordenesRecibidas(estado?, pagina?) → PaginatedOrdenes ← VENDEDOR
  - Query: orden(id) → Orden
  - Mutation: cambiarEstadoOrden(id, nuevoEstado, notas?) → Orden
  - Mutation: cancelarOrden(id, motivo) → Orden ← COMPRADOR (solo si PENDIENTE_PAGO o PAGADO)

Máquina de estados válida:
  PENDIENTE_PAGO  → [PAGADO, CANCELADO]  (solo via webhook Stripe)
  PAGADO          → [EN_PREPARACION, CANCELADO]  (vendedor o admin)
  EN_PREPARACION  → [ENVIADO]  (vendedor)
  ENVIADO         → [ENTREGADO]  (vendedor, con comprobante URL opcional)
  ENTREGADO       → [COMPLETADO]  (automático a los N días vía cron, o comprador)
  COMPLETADO      → []  (estado terminal)
  CANCELADO       → []  (estado terminal)

service (cambiarEstadoOrden):
  - Verificar que la transición es válida según la máquina de estados
  - Verificar permisos: COMPRADOR solo puede cancelar estados tempranos
  - Crear HistorialEstadoOrden
  - Crear Notificacion para el otro actor (comprador ↔ vendedor)
  - Si COMPLETADO: activar flujo de valoración (habilitar review)
  - Si CANCELADO con pago completado: iniciar reembolso Stripe (Sprint siguiente)
```

#### 4.2 Cron de auto-completar órdenes
```
- Cada hora: buscar órdenes en estado ENTREGADO con más de N días
  (N = configuracion_sistema.dias_auto_completar_orden)
- Cambiar a COMPLETADO automáticamente
- Crear HistorialEstadoOrden con nota "Auto-completado por sistema"
```

#### 4.3 Módulo Valoraciones
`backend/src/modules/valoraciones/`
```
typedefs:
  - Valoracion { id, calificacion, comentario, creadoEn, comprador, vendedor, respuesta }
  - Mutation: crearValoracion(ordenId, calificacion, comentario?) → Valoracion
  - Mutation: responderValoracion(valoracionId, respuesta) → RespuestaValoracion ← VENDEDOR
  - Query: valoracionesVendedor(vendedorId, pagina?) → PaginatedValoraciones
  - Query: miValoracion(ordenId) → Valoracion?  ← COMPRADOR

service (crearValoracion):
  - Verificar que la orden está en estado COMPLETADO
  - Verificar que es la orden del comprador autenticado
  - Verificar que no existe valoración previa para esa orden
  - Después de crear: actualizar ratingPromedio + totalResenias en PerfilVendedor
    (usar transacción: insertar valoración + recalcular promedio)

service (responderValoracion):
  - Verificar que la valoración es del vendedor autenticado
  - Verificar que no existe respuesta previa
```

#### 4.4 Módulo Notificaciones
`backend/src/modules/notificaciones/`
```
typedefs:
  - Notificacion { id, tipo, titulo, mensaje, leido, url, creadoEn }
  - Query: misNotificaciones(soloNoLeidas?) → [Notificacion]
  - Mutation: marcarLeida(id) → Boolean
  - Mutation: marcarTodasLeidas → Boolean

repository:
  - findNotificacionesByUsuario(usuarioId, soloNoLeidas, prisma)
  - markNotificacionLeida(id, prisma)
  - markAllLeidas(usuarioId, prisma)
```

---

### Tareas Frontend — Sprint 4

#### 4.5 Panel Comprador — Mis Órdenes
```
frontend/src/app/comprador/
  ├── layout.tsx
  ├── page.tsx                     ← dashboard comprador
  ├── ordenes/page.tsx             ← historial de órdenes con filtros
  ├── ordenes/[id]/page.tsx        ← detalle: items, estados, pago, valorar
  └── perfil/page.tsx              ← datos personales + direcciones
```

#### 4.6 Panel Vendedor — Órdenes Recibidas
```
frontend/src/app/vendedor/
  ├── ordenes/page.tsx             ← lista de órdenes recibidas con filtros
  ├── ordenes/[id]/page.tsx        ← detalle: cambiar estado, ver comprador
  └── valoraciones/page.tsx        ← reseñas recibidas + responder
```

#### 4.7 Componentes de Órdenes
```
frontend/src/components/ordenes/
  ├── OrdenCard.tsx               ← tarjeta con estado visual (badge de color)
  ├── TimelineEstados.tsx         ← historial de estados como timeline vertical
  ├── CambiarEstadoModal.tsx      ← modal VENDEDOR para cambiar estado + nota
  └── FormularioValoracion.tsx    ← estrellas + textarea + submit
```

#### 4.8 Notificaciones en tiempo real (polling)
```
- Por ahora: polling cada 30s a Query { misNotificaciones(soloNoLeidas: true) }
- Badge en navbar con contador de no leídas
- Al hacer clic en notificación: marcarLeida + navegar a la url
```

---

### Criterios de Aceptación — Sprint 4
- [ ] Vendedor puede avanzar estado de la orden según la máquina de estados
- [ ] Transiciones inválidas son rechazadas con error descriptivo
- [ ] Cron auto-completa órdenes entregadas después de N días
- [ ] Comprador recibe notificación en cada cambio de estado
- [ ] Solo se puede valorar una orden COMPLETADA (no antes)
- [ ] Rating del vendedor se actualiza automáticamente con cada nueva valoración
- [ ] Vendedor puede responder una valoración (solo una vez por valoración)
- [ ] Historial de estados muestra quién cambió cada estado y cuándo

---

## SPRINT 5 — Admin + Moderación + QA
> Duración: Semanas 9–10 | Sprint final

### Objetivo del Sprint
Panel de administración completo: gestión de usuarios, moderación de reportes,
configuración dinámica del sistema. QA integral: pruebas de carga hasta 100 usuarios
concurrentes y revisión de seguridad.

---

### Tareas Backend — Sprint 5

#### 5.1 Módulo Reportes y Moderación
`backend/src/modules/reportes/`
```
typedefs:
  - Reporte { id, tipo, referenciaId, motivo, descripcion, estado, reportador, creadoEn }
  - Mutation: crearReporte(tipo, referenciaId, motivo, descripcion?) → Reporte
  - Query: reportes(estado?, tipo?, pagina?) → PaginatedReportes ← ADMIN
  - Mutation: resolverReporte(id, estado, resolucion) → Reporte ← ADMIN

service (resolverReporte):
  - Validar que el estado es RESUELTO o RECHAZADO
  - Guardar resueltoPorId + resolucion + resueltoEn
  - Si RESUELTO y tipo=PRODUCTO: desactivar el producto
  - Si RESUELTO y tipo=VENDEDOR: desactivar el usuario (activo: false)
```

#### 5.2 Módulo Configuración del Sistema
`backend/src/modules/config-sistema/`
```
typedefs:
  - ConfigSistema { clave, valor, tipo, descripcion }
  - Query: configuracionSistema → [ConfigSistema]  ← ADMIN
  - Mutation: actualizarConfig(clave, valor) → ConfigSistema ← ADMIN

Cache en Redis:
  - Al leer una config: cache con TTL 1h
  - Al actualizar: invalidar cache de esa clave
  - Helper: getConfig(clave, prisma, redis) usado por todos los módulos
```

#### 5.3 Módulo Panel Admin — Usuarios
`backend/src/modules/admin/`
```
typedefs:
  - Query: usuarios(rol?, activo?, pagina?) → PaginatedUsuarios ← ADMIN
  - Query: usuarioDetalle(id) → UsuarioAdmin (con perfiles, órdenes, reportes)
  - Mutation: toggleActivoUsuario(id) → Usuario ← ADMIN
  - Mutation: cambiarRolUsuario(id, rol) → Usuario ← ADMIN

Stats para dashboard admin:
  - Query: estadisticasGenerales → { totalUsuarios, totalOrdenes, totalProductos,
                                      totalPagosHoy, ordenesUltimos7Dias[] }
```

---

### Tareas Frontend — Sprint 5

#### 5.4 Panel Admin
```
frontend/src/app/admin/
  ├── layout.tsx               ← sidebar admin
  ├── page.tsx                 ← dashboard con métricas clave
  ├── usuarios/page.tsx        ← tabla de usuarios con filtros + acciones
  ├── usuarios/[id]/page.tsx   ← detalle del usuario
  ├── reportes/page.tsx        ← cola de reportes pendientes
  ├── reportes/[id]/page.tsx   ← detalle del reporte + acción de moderación
  ├── productos/page.tsx       ← todos los productos (destacar, desactivar)
  └── configuracion/page.tsx  ← formulario de parámetros del sistema
```

#### 5.5 QA — Pruebas de Integración
```
- Vitest para pruebas unitarias de services críticos:
    · auth.service.test.ts → register, login, refreshToken, reset password
    · pagos.service.test.ts → crearPaymentIntent, validación de stock
    · valoraciones.service.test.ts → calificación, actualización de rating
    · ordenes.service.test.ts → máquina de estados, transiciones válidas/inválidas

Cobertura mínima objetivo: 60% en services
```

#### 5.6 QA — Pruebas de Carga con k6
```
Script: k6/load-test.js
Escenario de 100 usuarios virtuales concurrentes:
  - 40% → búsqueda de productos (GET /graphql con query buscarProductos)
  - 30% → ver detalle de producto
  - 20% → operaciones de carrito
  - 10% → checkout (mock, no Stripe real)

Meta:
  - P95 < 3000ms
  - Error rate < 1%
  - No memory leaks después de 10min de carga sostenida
```

#### 5.7 Revisión de Seguridad (checklist)
```
- [ ] Passwords nunca en logs ni respuestas GraphQL
- [ ] JWT secret no es el default, es aleatorio y largo
- [ ] Webhook de Stripe verifica firma antes de procesar
- [ ] Operaciones de admin verifican rol ADMIN en el resolver
- [ ] No hay SQL injection (Prisma parametriza todas las queries)
- [ ] Rate limiting en mutaciones de auth (máx 5 intentos/min por IP)
- [ ] Datos sensibles no en URLs (tokens en body, no query string)
- [ ] CORS solo permite el origen del frontend
- [ ] Soft delete en productos (nunca borrar datos históricos)
- [ ] Precios manejados con Decimal.js, nunca con float nativos
```

---

### Criterios de Aceptación — Sprint 5
- [ ] Admin puede ver todos los usuarios, activar/desactivar, cambiar roles
- [ ] Cola de reportes pendientes visible y accionable por el admin
- [ ] Configuración del sistema se puede cambiar desde la UI sin reiniciar el servidor
- [ ] Tests unitarios de los 4 services críticos pasan sin errores
- [ ] Prueba k6 con 100 VUs concurrentes: P95 < 3s, error rate < 1%
- [ ] Checklist de seguridad completado y documentado
- [ ] `tsc --noEmit` sin errores en backend y frontend

---

## TRANSVERSAL — Normas que aplican en todos los sprints

### Organización de archivos
```
backend/src/
  ├── config/
  │   └── env.ts
  ├── graphql/
  │   ├── schema.ts          ← mergeTypeDefs de todos los módulos
  │   └── resolvers.ts       ← mergeResolvers de todos los módulos
  ├── modules/
  │   ├── auth/
  │   │   ├── auth.typedefs.ts
  │   │   ├── auth.repository.ts
  │   │   ├── auth.service.ts
  │   │   ├── auth.resolver.ts
  │   │   └── auth.validators.ts
  │   ├── productos/
  │   ├── categorias/
  │   ├── busqueda/
  │   ├── carrito/
  │   ├── ofertas/
  │   ├── cupones/
  │   ├── pagos/
  │   ├── ordenes/
  │   ├── valoraciones/
  │   ├── notificaciones/
  │   ├── reportes/
  │   ├── config-sistema/
  │   └── admin/
  ├── plugins/
  │   ├── auth.plugin.ts
  │   └── cors.plugin.ts
  └── shared/
      ├── cache.util.ts
      ├── decimal.util.ts
      ├── guards.ts
      ├── jwt.util.ts
      ├── mailer.ts
      ├── prisma.client.ts
      ├── redis.client.ts
      └── types/
          └── context.type.ts
```

### Reglas de negocio inamovibles
| Regla | Razón |
|---|---|
| Precios siempre con `Decimal` (decimal.js) | Float nativo pierde centavos en montos grandes |
| Soft delete en productos (nunca hard delete) | Los items_orden referencian productos históricos |
| Snapshot de precio y nombre en items_orden | El precio puede cambiar después de la compra |
| Snapshot de dirección en orden (JSON) | La dirección puede cambiar o borrarse |
| Refresh token guardado como HASH en DB | Si la DB se compromete, los tokens no son válidos |
| Stock se descuenta al crear orden, no al pagar | Evita sobreventa durante el tiempo de pago |
| Stock se restituye si el webhook falla | Fuente de verdad: el webhook de Stripe |
| HistorialEstadoOrden en cada cambio de estado | Auditoría completa para reclamos |
| ratingPromedio recalculado en transacción | Evita condición de carrera en valoraciones concurrentes |
| Webhook es la fuente de verdad del pago | El frontend puede mentir; el webhook no |

### Convenciones de código
- Nombres de resolvers: `camelCase` en GraphQL, `snake_case` en DB (via `@map`)
- Errores GraphQL: usar `GraphQLError` con `extensions.code` tipado
- Todos los precios en Decimal antes de enviar a Stripe (stripe acepta centavos enteros)
- Paginación estándar: `{ pagina: Int = 1, limite: Int = 20 }`
- IDs: `cuid()` para todas las tablas
- Fechas: siempre UTC en backend, formatear en frontend según locale boliviano

---

## RESUMEN EJECUTIVO POR SPRINT

| Sprint | Duración | Backend | Frontend | Entregable clave |
|---|---|---|---|---|
| **Sprint 1** | Sem 1–2 | Auth completo (register, login, refresh, verify, reset) | Páginas auth + guards + Apollo setup | Usuario puede iniciar sesión y renovar sesión |
| **Sprint 2** | Sem 3–4 | Catálogo + Búsqueda FTS + Carrito | Home + Catálogo + Panel Vendedor | Comprador navega y agrega al carrito |
| **Sprint 3** | Sem 5–6 | Ofertas + Cupones + Stripe Webhook | Checkout + Pago + Confirmación | Flujo de pago completo funciona en sandbox |
| **Sprint 4** | Sem 7–8 | Órdenes + Máquina Estados + Valoraciones | Panel Órdenes + Notificaciones | Vendedor gestiona órdenes, comprador valora |
| **Sprint 5** | Sem 9–10 | Admin + Reportes + Config Sistema | Panel Admin + Tests + k6 | Sistema moderable, 100 usuarios concurrentes |

---

*NexCom — Plan de Desarrollo v1.0 | Mayo 2026 | UAGRM Santa Cruz, Bolivia*
