# Análisis Técnico del Proyecto NexCom
> Documento generado para el Plan de Desarrollo de Software (PDS)
> Fecha de análisis: 09/06/2026

---

## 1. Stack Tecnológico Completo

### 1.1 Lenguajes de programación

- **Frontend**: TypeScript 5.x (con JSX/TSX), sobre Next.js 15 (App Router)
- **Backend**: TypeScript 5.5.4, ejecutado con `tsx` en desarrollo y compilado a JavaScript (ES2022, módulos Node16) en producción

### 1.2 Frameworks y librerías principales

**Frontend** (`frontend/package.json`):

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15.5.18 (con Turbopack) | Framework React (App Router) |
| React / React DOM | 19.1.0 | Librería de UI |
| Tailwind CSS | ^4 | Estilos (vía `@tailwindcss/postcss`) |
| Apollo Client | ^3.11.8 | Cliente GraphQL |
| GraphQL | ^16.14.0 | Lenguaje de consulta |
| react-hook-form + @hookform/resolvers | ^7.76.1 / ^5.4.0 | Manejo de formularios |
| Zod | ^4.4.3 | Validación de esquemas (frontend) |
| lucide-react | ^1.16.0 | Íconos |
| sonner | ^2.0.7 | Notificaciones tipo toast |
| clsx / tailwind-merge | ^2.1.1 / ^3.6.0 | Utilidades de clases CSS |
| decimal.js | ^10.5.0 | Precisión decimal en precios |
| @stripe/stripe-js, @stripe/react-stripe-js | ^5.7.0 / ^3.7.0 | Integración de pagos |

**Backend** (`backend/package.json`):

| Tecnología | Versión | Uso |
|---|---|---|
| Fastify | ^4.28.0 | Framework HTTP del servidor |
| GraphQL Yoga | ^5.7.0 | Servidor GraphQL sobre Fastify |
| graphql | ^16.9.0 | Lenguaje de consulta |
| @graphql-tools/schema, @graphql-tools/merge | ^10.0.0 / ^9.0.0 | Composición modular del esquema |
| Prisma + @prisma/client + @prisma/adapter-pg | 7.8.0 | ORM y adaptador PostgreSQL |
| pg | ^8.13.3 | Driver nativo de PostgreSQL |
| jsonwebtoken | ^9.0.2 | Autenticación JWT |
| bcryptjs | ^2.4.3 | Hash de contraseñas |
| stripe | ^15.7.0 (API `2024-04-10`) | Pasarela de pagos |
| ioredis | ^5.4.1 | Cliente de Redis (cache) |
| nodemailer | ^6.9.15 | Envío de correos |
| @fastify/cors | ^9.0.1 | CORS |
| @fastify/multipart | ^8.3.0 | Subida de archivos |
| zod | ^3.23.8 | Validación de esquemas (backend) |
| dotenv | ^17.4.2 | Variables de entorno |

### 1.3 Gestor de base de datos

- **PostgreSQL 17.x** como motor relacional principal.
- Acceso vía **Prisma ORM 7.8.0** con adaptador `@prisma/adapter-pg`.
- Esquema definido en `backend/prisma/schema.prisma` (~663 líneas): **29 tablas** y **6 enums**.
- **Redis 7.2.x** como capa de caché (no es base de datos persistente principal, sino cache distribuido para catálogo, búsquedas, ofertas, etc., con TTLs configurables).

### 1.4 Herramientas de autenticación

- **JWT (jsonwebtoken v9.0.2)**: implementación propia (no se usa Passport ni NextAuth).
  - Access Token: expiración configurable (default `15m`)
  - Refresh Token: expiración configurable (default `7d`), persistido en tabla `refresh_tokens`
- **bcryptjs**: hashing de contraseñas.
- Tokens almacenados en `localStorage` del navegador (`nexcom_access_token`, `nexcom_refresh_token`) e inyectados en cada request GraphQL vía Apollo `authLink`.
- Verificación de email y recuperación de contraseña mediante tokens de un solo uso (tabla `tokens_verificacion`).
- Autorización basada en roles (`ADMIN`, `VENDEDOR`, `COMPRADOR`) verificada en el contexto de cada resolver GraphQL.

### 1.5 Integración de Stripe

- **Sí, se usa Stripe**, en **modo TEST/Sandbox** (claves `sk_test_...` y `pk_test_...`).
- Versión de API fijada: `2024-04-10`.
- **Backend** (`stripe` v15.7.0):
  - Módulo `pagos` crea un `PaymentIntent` mediante la mutación GraphQL `crearPaymentIntent`.
  - Endpoint REST dedicado `POST /webhooks/stripe` para recibir eventos (validados con `stripe.webhooks.constructEvent` y `STRIPE_WEBHOOK_SECRET`).
  - Eventos manejados: `payment_intent.succeeded` (confirma orden, vacía carrito, genera notificaciones) y `payment_intent.payment_failed` (cancela orden y restituye stock).
- **Frontend** (`@stripe/stripe-js` + `@stripe/react-stripe-js`):
  - Usa `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (clave pública `pk_test_...`) para renderizar el formulario de pago (Stripe Elements) en el flujo de checkout.

---

## 2. Herramientas y Entorno de Desarrollo

### 2.1 Control de versiones

- **Git**, repositorio alojado en **GitHub**: `https://github.com/proyectosw22025-ux/NexCom.git`
- Rama principal: `master`
- Commits recientes muestran enfoque iterativo de fixes de despliegue (CORS, Suspense boundaries, force-dynamic, CartProvider, etc.)

### 2.2 Configuración de entorno

- No se usa Docker ni docker-compose en este proyecto (no se encontraron archivos `Dockerfile` ni `docker-compose.yml`).
- Variables de entorno gestionadas mediante archivos `.env`:
  - `backend/.env.example` → plantilla con todas las variables necesarias en producción.
  - `frontend/.env.local` → variables públicas del cliente (`NEXT_PUBLIC_*`).
- Variables clave del backend: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAIL_HOST/PORT/USER/PASS/FROM`, `FRONTEND_URL`, `GRAPHQL_PATH`, y TTLs de cache (`CACHE_TTL_*`).
- Validación de variables de entorno con **Zod** (`backend/src/config/env.ts`).

### 2.3 Gestor de paquetes

- **npm** (existen `package-lock.json` en `frontend/` y `backend/` por separado — no es un monorepo con workspaces, sino dos proyectos independientes en carpetas separadas).
- Node.js requerido: `>=22.x` (LTS).

### 2.4 Testing

- **No se encontraron herramientas de testing configuradas** (no hay Jest, Vitest, Cypress ni Playwright en el proyecto). La validación se realiza actualmente mediante TypeScript en modo `strict` y revisión manual/lint.

---

## 3. Arquitectura del Sistema

### 3.1 Capas / servicios

El sistema está dividido en **dos proyectos independientes** dentro de un mismo repositorio (no es monorepo con workspaces, ni microservicios):

1. **`frontend/`** — Aplicación Next.js 15 (App Router), renderizado SSR/CSR híbrido.
2. **`backend/`** — API GraphQL única construida con Fastify + GraphQL Yoga, organizada en **17 módulos de dominio** siguiendo una arquitectura por capas (typedefs → resolver → service → repository → validators).

Es una arquitectura de tipo **frontend desacoplado + API GraphQL monolítica modular** (no microservicios).

### 3.2 Comunicación frontend-backend

- **GraphQL** sobre HTTP (un único endpoint `/graphql`, servido por GraphQL Yoga sobre Fastify).
- Cliente: **Apollo Client**, configurado en `frontend/src/lib/apollo-client.ts`.
  - URL del endpoint definida por `NEXT_PUBLIC_GRAPHQL_URL` (fallback a `http://localhost:4000/graphql` en desarrollo).
  - `authLink` añade el header `Authorization: Bearer <token>` con el access token desde `localStorage`.
  - `errorLink` detecta errores `UNAUTHENTICATED` y redirige a `/login` limpiando los tokens.
- Adicionalmente existe un endpoint **REST** dedicado (`POST /webhooks/stripe`) para los webhooks de Stripe, ya que requieren el cuerpo "raw" de la petición.
- CORS configurado en `backend/src/plugins/cors.plugin.ts` permitiendo: `FRONTEND_URL`, dominios `*.vercel.app`, dominios `*.railway.app`, y `http://localhost:3000` en desarrollo.

### 3.3 Bases de datos

- **Una única base de datos PostgreSQL** (17.x) con **29 tablas** y **6 enums**, gestionada vía Prisma ORM.
- **Redis** se usa exclusivamente como **caché** (no como base de datos de persistencia), con conexión no bloqueante (la app arranca aunque Redis no esté disponible).

Principales grupos de tablas:
- **Usuarios y autenticación**: `usuarios`, `refresh_tokens`, `tokens_verificacion`, `perfiles_vendedor`, `perfiles_comprador`, `direcciones`
- **Catálogo**: `categorias`, `productos`, `imagenes_producto`, `etiquetas`, `producto_etiquetas`, `favoritos`
- **Carrito y ofertas**: `carritos`, `items_carrito`, `ofertas`, `oferta_productos`, `cupones`, `usos_cupon`
- **Órdenes y pagos**: `ordenes`, `items_orden`, `historial_estados_orden`, `pagos`
- **Interacción social**: `valoraciones`, `respuestas_valoracion`, `conversaciones`, `mensajes`
- **Administración**: `reportes`, `configuracion_sistema`, `notificaciones`

Enums: `Rol`, `EstadoOferta`, `EstadoOrden`, `EstadoPago`, `EstadoReporte`, `TipoReporte`.

### 3.4 Estructura de carpetas (resumen)

```
ProyectoSW1/
├── frontend/                     # Next.js 15 (App Router)
│   └── src/
│       ├── app/
│       │   ├── (auth)/           # login, registro, verificación, recuperación
│       │   ├── (main)/           # buscar, productos/[id]
│       │   ├── admin/            # panel de administración
│       │   ├── checkout/         # pago y confirmación
│       │   ├── comprador/        # dashboard del comprador
│       │   └── vendedor/         # dashboard del vendedor
│       ├── components/           # busqueda, cart, productos, ui
│       ├── context/               # contextos de React (carrito, auth)
│       ├── graphql/               # queries y mutations por módulo
│       └── lib/                   # apollo-client, apollo-provider, utils
│
├── backend/                       # Fastify + GraphQL Yoga
│   └── src/
│       ├── index.ts               # entry point (servidor + webhooks Stripe)
│       ├── config/env.ts          # validación de entorno (Zod)
│       ├── graphql/               # schema.ts y resolvers.ts (merge de módulos)
│       ├── modules/                # 17 módulos: auth, admin, productos,
│       │                           # carrito, ofertas, pagos, ordenes,
│       │                           # valoraciones, reportes, etc.
│       ├── plugins/                # cors.plugin.ts, auth.plugin.ts
│       ├── shared/                 # prisma.client, redis.client, jwt.util, cache.util
│       └── scripts/                # seed-data.ts, seed-admin.ts
│   └── prisma/
│       ├── schema.prisma           # 29 tablas, 6 enums
│       └── migrations/
│
├── vercel.json                     # configuración de despliegue del frontend
└── PLAN_DESARROLLO.md, STACK.md, DATABASE.md, etc.
```

---

## 4. Despliegue

> **Nota importante**: el repositorio define la *infraestructura objetivo* mediante archivos de configuración y plantillas `.env.example`, pero **no contiene URLs de producción reales hardcodeadas** (las URLs reales se configuran como variables de entorno en cada plataforma y no se versionan).

### 4.1 Plataformas previstas/configuradas

- **Frontend**: **Vercel**. Existe `vercel.json` en la raíz que define el servicio `frontend` con `framework: "nextjs"` y `root: "frontend"`.
- **Backend**: el CORS del backend está preparado explícitamente para aceptar orígenes de **Railway** (`*.railway.app`) y **Vercel** (`*.vercel.app`), lo que indica que el backend está pensado para desplegarse en **Railway**.
- **Base de datos**: **Neon PostgreSQL** (según comentarios en `backend/.env.example`, que referencian `console.neon.tech` y el formato `host.neon.tech`).
- **Cache**: **Upstash Redis** (según `backend/.env.example`, referencia a `console.upstash.com` y formato `rediss://...upstash.io`).
- **Email (sandbox)**: **Mailtrap** (`smtp.mailtrap.io`).

### 4.2 Frontend y backend: ¿separados o juntos?

Están **desplegados por separado**: el frontend como proyecto Next.js en Vercel, y el backend como servicio Node.js independiente en Railway, comunicándose vía la URL pública de GraphQL configurada en `NEXT_PUBLIC_GRAPHQL_URL`.

### 4.3 URL del sistema desplegado

No se encontró una URL de producción definitiva en el código (no hay dominios reales hardcodeados, solo los patrones genéricos `*.vercel.app`, `*.railway.app` en la configuración CORS y en plantillas de ejemplo). **Se recomienda completar este punto con la URL real proporcionada por el equipo** una vez verificado el despliegue activo en Vercel/Railway.

### 4.4 Proceso de despliegue

- **Manual / automático vía integración Git de Vercel y Railway** (no se encontraron workflows de GitHub Actions ni archivos de CI/CD explícitos en el repositorio).
- Vercel: build con `next build --turbopack`, start con `next start` (definidos en `frontend/package.json`).
- Backend: scripts definidos en `backend/package.json`:
  - `build`: `prisma generate && tsc`
  - `start`: `prisma migrate deploy && node dist/index.js` (aplica migraciones automáticamente al iniciar)
  - `postinstall`: `prisma generate`

### 4.5 Servidor web en producción

- **Frontend**: servidor integrado de Next.js (`next start`), servido a través de la infraestructura de Vercel (no Nginx/Apache explícito).
- **Backend**: servidor HTTP integrado de **Fastify** (no usa Nginx/Apache como proxy explícito en el repositorio).

---

## 5. Módulos Desarrollados (hasta Sprint 3)

### 5.1 Módulos backend implementados (GraphQL, 17 módulos)

Cada módulo sigue arquitectura en capas (`typedefs` → `resolver` → `service` → `repository` → `validators`):

1. **auth** — registro, login, JWT (access/refresh), verificación de email, recuperación de contraseña
2. **admin** — operaciones administrativas y moderación
3. **busqueda** — búsqueda full-text y filtros por categoría/precio
4. **carrito** — gestión del carrito de compras
5. **categorias** — árbol jerárquico de categorías
6. **config-sistema** — parámetros de configuración dinámica
7. **cupones** — cupones de descuento
8. **direcciones** — direcciones de envío
9. **etiquetas** — etiquetas/tags de productos
10. **favoritos** — lista de deseos
11. **notificaciones** — sistema de notificaciones
12. **ofertas** — ofertas con vigencia temporal (programada/activa/vencida/cancelada)
13. **ordenes** — gestión de órdenes y su historial de estados
14. **pagos** — integración con Stripe (PaymentIntents y webhooks)
15. **productos** — catálogo de productos
16. **reportes** — reportes de moderación (producto, vendedor, valoración, oferta, mensaje)
17. **valoraciones** — reseñas y calificaciones, con respuestas del vendedor

### 5.2 Endpoints principales

- **GraphQL**: un único endpoint `POST /graphql` (GraphQL Yoga sobre Fastify), que expone queries y mutations de los 17 módulos anteriores (ej. `login`, `registro`, `crearPaymentIntent`, `productos`, `crearOrden`, `misOrdenes`, `agregarAlCarrito`, etc.).
- **REST**: `POST /webhooks/stripe` — recepción de eventos de Stripe (`payment_intent.succeeded`, `payment_intent.payment_failed`).

### 5.3 Panel de administración

**Sí, está implementado** en el frontend (`frontend/src/app/admin/`):

- `/admin` — dashboard principal
- `/admin/productos` — gestión de productos
- `/admin/usuarios` y `/admin/usuarios/[id]` — gestión de usuarios
- `/admin/reportes` y `/admin/reportes/[id]` — gestión de reportes/moderación
- `/admin/configuracion` — configuración del sistema

Adicionalmente existen dashboards específicos por rol:
- `/vendedor/*` — productos, ofertas, órdenes, valoraciones (panel del vendedor)
- `/comprador/*` — órdenes, perfil, favoritos (panel del comprador)
- `/checkout/*` — flujo de pago y confirmación

---

## 6. Estándares de Codificación

### 6.1 Linters y formateadores

- **ESLint** (frontend), configuración en `frontend/eslint.config.mjs` (formato flat config), basada en `next/core-web-vitals` y `next/typescript`.
- **TypeScript en modo `strict: true`** en ambos proyectos (frontend y backend), lo que actúa como verificación de tipos estricta además del linting.
- No se encontró configuración de Prettier explícita.

### 6.2 Convenciones de nombrado

- **Archivos/módulos**: `kebab-case` (ej. `apollo-client.ts`, `auth.service.ts`, `jwt.util.ts`).
- **Variables y funciones (TypeScript)**: `camelCase`.
- **Constantes de entorno**: `UPPER_SNAKE_CASE` (ej. `JWT_ACCESS_SECRET`, `CACHE_TTL_PRODUCTO`).
- **Base de datos (Prisma/PostgreSQL)**: tablas y campos en `snake_case` (ej. `perfiles_vendedor`, `usos_cupon`), mapeados a `camelCase` en el código TypeScript mediante `@map`.
- **Enums de base de datos**: valores en `UPPER_SNAKE_CASE` (ej. `PENDIENTE_PAGO`, `EN_PREPARACION`).
- **GraphQL**: tipos en `PascalCase`, campos y operaciones (queries/mutations) en `camelCase`, valores de enum en `UPPERCASE`.
- **Validación**: esquemas con **Zod** tanto en frontend (formularios con react-hook-form) como en backend (inputs de mutations).

---

## Resumen Ejecutivo del Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js + React + Apollo Client | 15.5.18 / 19.1.0 / 3.11.8 |
| Backend | Fastify + GraphQL Yoga | 4.28.0 / 5.7.0 |
| ORM | Prisma (adapter-pg) | 7.8.0 |
| Base de datos | PostgreSQL | 17.x |
| Cache | Redis (Upstash) | 7.2.x |
| Autenticación | JWT (jsonwebtoken) + bcryptjs | propio |
| Pagos | Stripe (modo test) | API 2024-04-10 / SDK 15.7.0 |
| Lenguaje | TypeScript | ^5 / 5.5.4 |
| Estilos | Tailwind CSS | ^4 |
| Runtime | Node.js | >=22.x LTS |
| Repositorio | GitHub | proyectosw22025-ux/NexCom |
| Despliegue previsto | Vercel (frontend) + Railway (backend) + Neon (BD) + Upstash (cache) | — |

> **Pendiente de confirmar manualmente**: URL(s) reales de producción activas (Vercel/Railway), ya que no están versionadas en el código por buenas prácticas de seguridad.
