# STACK TECNOLÓGICO OFICIAL — NEXCOM
> Versiones estables y verificadas | Inicio del proyecto: Mayo 2026
> PostgreSQL 17 + pgAdmin 4 ya instalados ✓

---

## RESUMEN DEL PROYECTO

| Métrica | Valor |
|---|---|
| Total de tablas en PostgreSQL | **13 tablas** |
| Total de módulos de negocio | **8 módulos** |
| Total de enums en la DB | **4 enums** |
| Sprints planificados | **5 sprints × 2 semanas** |
| Duración total | **10 semanas (~3 meses)** |
| Equipo | **5 personas** |
| Usuarios concurrentes objetivo | **100** |
| Tiempo de respuesta máximo | **< 3 segundos** |

---

## TABLAS DE BASE DE DATOS (13 tablas + 4 enums)

### Tablas

| # | Tabla | Módulo | Descripción |
|---|---|---|---|
| 1 | `usuarios` | Auth | Base de todos los actores del sistema |
| 2 | `tokens_verificacion` | Auth | Tokens de email y reset de contraseña |
| 3 | `perfiles_vendedor` | Auth | Datos extendidos del vendedor/negocio |
| 4 | `perfiles_comprador` | Auth | Datos extendidos del comprador |
| 5 | `categorias` | Catálogo | Árbol de categorías (auto-referenciada) |
| 6 | `productos` | Catálogo | Catálogo digital del vendedor |
| 7 | `imagenes_producto` | Catálogo | URLs de imágenes por producto |
| 8 | `ofertas` | Ofertas | Anuncios con fecha de inicio y fin |
| 9 | `ordenes` | Órdenes/Pagos | Registro de cada transacción |
| 10 | `items_orden` | Órdenes | Líneas de productos dentro de una orden |
| 11 | `pagos` | Pagos | Registro del pago Stripe por orden |
| 12 | `valoraciones` | Reseñas | Calificaciones post-transacción |
| 13 | `notificaciones` | Transversal | Avisos para compradores y vendedores |

### Enums

| # | Enum | Valores |
|---|---|---|
| 1 | `Rol` | `ADMIN`, `VENDEDOR`, `COMPRADOR` |
| 2 | `EstadoOferta` | `PROGRAMADA`, `ACTIVA`, `VENCIDA`, `CANCELADA` |
| 3 | `EstadoOrden` | `PENDIENTE_PAGO`, `PAGADO`, `EN_PREPARACION`, `ENVIADO`, `ENTREGADO`, `COMPLETADO`, `CANCELADO` |
| 4 | `EstadoPago` | `PENDIENTE`, `COMPLETADO`, `FALLIDO`, `REEMBOLSADO` |

---

## MÓDULOS DEL SISTEMA (8 módulos)

| # | Módulo | Sprint | Tablas involucradas | Complejidad |
|---|---|---|---|---|
| 1 | **Auth + Roles** | Sprint 1 | usuarios, tokens, perfiles_vendedor, perfiles_comprador | Alta |
| 2 | **Catálogo de Productos** | Sprint 2 | productos, imagenes_producto, categorias | Media |
| 3 | **Búsqueda y Filtros** | Sprint 2 | productos, categorias (Full-Text Search) | Media |
| 4 | **Ofertas con Vigencia** | Sprint 3 | ofertas | Baja-Media |
| 5 | **Pasarela de Pagos (Stripe)** | Sprint 3 | pagos, ordenes | Alta |
| 6 | **Gestión de Órdenes** | Sprint 4 | ordenes, items_orden, notificaciones | Alta |
| 7 | **Valoraciones y Reseñas** | Sprint 4 | valoraciones, perfiles_vendedor | Media |
| 8 | **Panel de Administración** | Sprint 5 | Todas (solo lectura + acciones de moderación) | Media |

---

## VERSIONES ESTABLES DEL STACK — NEXCOM

> Criterio de selección: LTS activo, sin breaking changes recientes,
> documentación sólida, comunidad activa, compatible entre sí.

---

### CAPA DE BASE DE DATOS

| Herramienta | Versión | Estado | EOL | Notas |
|---|---|---|---|---|
| **PostgreSQL** | `17.x` | LTS Activo ✓ | Nov 2029 | Ya instalado. Tipo NUMERIC exacto para precios |
| **pgAdmin 4** | `8.x` | Estable ✓ | N/A | Ya instalado. Compatible con PG 17 |
| **Redis** | `7.2.x` | Estable ✓ | 2026+ | Para Windows: usar Redis Stack o WSL2 |

```bash
# Verificar versiones instaladas
psql --version          # PostgreSQL 17.x
redis-server --version  # Redis server v=7.2.x
```

---

### CAPA DE RUNTIME Y GESTOR DE PAQUETES

| Herramienta | Versión | Estado | EOL | Notas |
|---|---|---|---|---|
| **Node.js** | `22.x LTS` | Active LTS ✓ | Apr 2027 | NO usar 18.x (en Maintenance). NO usar 24.x (no es LTS aún) |
| **pnpm** | `9.x` | Estable ✓ | N/A | Más rápido que npm en monorrepos. Reemplaza a npm |
| **TypeScript** | `5.5.x` | Estable ✓ | N/A | Mismo lenguaje frontend y backend. Strict mode activado |

```bash
# Instalación
winget install OpenJS.NodeJS.LTS          # Node.js 22 LTS
npm install -g pnpm@latest                # pnpm 9.x

# Verificar
node --version          # v22.x.x
pnpm --version          # 9.x.x
tsc --version           # Version 5.5.x
```

---

### CAPA BACKEND

| Librería | Versión | Estado | Notas |
|---|---|---|---|
| **Fastify** | `4.28.x` | Estable ✓ (battle-tested) | 2-3x más rápido que Express. v5 existe pero v4 es más madura |
| **@fastify/cors** | `9.x` | Estable ✓ | Plugin oficial de CORS para Fastify 4 |
| **@fastify/multipart** | `8.x` | Estable ✓ | Upload de imágenes |
| **graphql-yoga** | `5.x` | Estable ✓ | Servidor GraphQL estándar W3C, integra con Fastify |
| **graphql** | `16.x` | Estable ✓ | Engine GraphQL base (peer dependency) |
| **@graphql-tools/schema** | `10.x` | Estable ✓ | Combinar typeDefs y resolvers |
| **Prisma** | `5.x` | Estable ✓ | ORM con migrations, tipado automático, Prisma Studio |
| **@prisma/client** | `5.x` | Estable ✓ | Debe coincidir con versión de Prisma |
| **ioredis** | `5.x` | Estable ✓ | Cliente Redis más completo y tipado |
| **decimal.js** | `10.x` | Estable ✓ | Aritmética de precisión exacta para precios |
| **stripe** | `15.x` | Estable ✓ | SDK oficial de Stripe para Node.js |
| **jsonwebtoken** | `9.x` | Estable ✓ | Generación y verificación de JWT |
| **bcryptjs** | `2.4.x` | Estable ✓ | Hash de contraseñas (sin dependencias nativas) |
| **nodemailer** | `6.x` | Estable ✓ | Envío de emails (verificación de cuenta) |
| **zod** | `3.x` | Estable ✓ | Validación de esquemas + inferencia de tipos TypeScript |

```bash
# Instalar todas las dependencias del backend de una vez
cd backend
pnpm add fastify @fastify/cors @fastify/multipart
pnpm add graphql graphql-yoga @graphql-tools/schema @graphql-tools/merge
pnpm add @prisma/client ioredis decimal.js stripe
pnpm add jsonwebtoken bcryptjs nodemailer zod
pnpm add -D typescript tsx nodemon prisma
pnpm add -D @types/node @types/jsonwebtoken @types/bcryptjs @types/nodemailer
```

---

### CAPA FRONTEND

| Librería | Versión | Estado | Notas |
|---|---|---|---|
| **Next.js** | `15.x` | Estable ✓ | App Router. NO usar Pages Router en proyectos nuevos |
| **React** | `19.x` | Estable ✓ | Incluido con Next.js 15. Server Components habilitados |
| **TypeScript** | `5.5.x` | Estable ✓ | Configurado por create-next-app |
| **Tailwind CSS** | `3.4.x` | Estable ✓ | NO usar v4 aún (breaking changes, ecosistema inmaduro) |
| **Apollo Client** | `3.11.x` | Estable ✓ | Cliente GraphQL con cache normalizado y hooks |
| **@stripe/stripe-js** | `4.x` | Estable ✓ | Stripe Elements para el formulario de pago |
| **@stripe/react-stripe-js** | `2.x` | Estable ✓ | Componentes React de Stripe |
| **react-hook-form** | `7.x` | Estable ✓ | Manejo de formularios sin re-renders innecesarios |
| **zod** | `3.x` | Estable ✓ | Validación de formularios (mismo schema que backend) |
| **@hookform/resolvers** | `3.x` | Estable ✓ | Integra zod con react-hook-form |
| **lucide-react** | `0.400+` | Estable ✓ | Íconos SVG limpios y tree-shakeable |
| **clsx** | `2.x` | Estable ✓ | Combinar clases de Tailwind condicionalmente |
| **tailwind-merge** | `2.x` | Estable ✓ | Resolver conflictos de clases Tailwind |
| **sonner** | `1.x` | Estable ✓ | Notificaciones toast elegantes |
| **decimal.js** | `10.x` | Estable ✓ | Mostrar precios sin errores de punto flotante |

```bash
# El frontend se crea con create-next-app (incluye Next.js, React, Tailwind, TypeScript)
pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --src-dir

cd frontend
pnpm add @apollo/client graphql
pnpm add @stripe/stripe-js @stripe/react-stripe-js
pnpm add react-hook-form zod @hookform/resolvers
pnpm add lucide-react clsx tailwind-merge sonner decimal.js
```

---

### HERRAMIENTAS DE DESARROLLO Y TESTING

| Herramienta | Versión | Propósito |
|---|---|---|
| **Stripe CLI** | `latest` | Tunnel de webhooks en desarrollo local |
| **Prisma Studio** | (incluido en Prisma) | Visualizar datos en PostgreSQL sin SQL |
| **Thunder Client** | Extensión VS Code | Probar queries GraphQL localmente |
| **Nodemon / tsx** | `tsx 4.x` | Hot-reload del servidor backend en desarrollo |
| **Vitest** | `2.x` | Tests unitarios (más rápido que Jest, compatible con TypeScript) |
| **k6** | `0.50+` | Pruebas de carga (100 usuarios concurrentes) |

---

## TABLA DE COMPATIBILIDAD ENTRE VERSIONES

```
Node.js 22 LTS
    ├── Next.js 15          ✓ requiere Node.js 18+
    ├── Fastify 4           ✓ requiere Node.js 14+
    ├── Prisma 5            ✓ requiere Node.js 16+
    ├── graphql-yoga 5      ✓ requiere Node.js 18+
    └── ioredis 5           ✓ requiere Node.js 12+

PostgreSQL 17
    └── Prisma 5            ✓ soporta PG 14, 15, 16, 17

TypeScript 5.5
    ├── Next.js 15          ✓ soporte oficial
    ├── Prisma 5            ✓ genera tipos automáticamente
    └── Zod 3               ✓ inferencia de tipos completa

Tailwind CSS 3.4
    └── Next.js 15          ✓ configurado automáticamente con create-next-app
```

---

## PUERTOS LOCALES DE DESARROLLO

| Servicio | Puerto | URL de Desarrollo |
|---|---|---|
| Next.js (Frontend) | `3000` | http://localhost:3000 |
| Fastify + GraphQL (Backend) | `4000` | http://localhost:4000/graphql |
| PostgreSQL | `5432` | localhost:5432 |
| pgAdmin 4 | `5050` | http://localhost:5050 |
| Redis | `6379` | localhost:6379 |
| Prisma Studio | `5555` | http://localhost:5555 |
| Stripe CLI (webhook tunnel) | `4000` | stripe listen --forward-to localhost:4000/webhooks/stripe |

---

## ARCHIVOS DE CONFIGURACIÓN CLAVE

```
ProyectoSW1/
├── backend/
│   ├── .env                    ← DATABASE_URL, REDIS_URL, JWT_SECRET, STRIPE_SECRET
│   ├── tsconfig.json           ← target: ES2022, strict: true
│   └── prisma/schema.prisma    ← 13 tablas, 4 enums
│
└── frontend/
    ├── .env.local              ← NEXT_PUBLIC_GRAPHQL_URL
    └── tsconfig.json           ← paths: { "@/*": ["./src/*"] }
```

---

## VERSIONES A EVITAR

| Tecnología | Versión a EVITAR | Razón |
|---|---|---|
| Node.js | `18.x` | En Maintenance, saldrá de soporte Abril 2025 |
| Node.js | `24.x` | No es LTS todavía (se vuelve LTS Oct 2025) |
| Tailwind CSS | `4.x` | Breaking changes, ecosistema de plugins aún inmaduro |
| Fastify | `5.x` | Liberado Oct 2024, en proceso de maduración del ecosistema |
| Next.js | `13.x` o `14.x` | Hay versión más reciente estable (15.x) |
| Prisma | `4.x` | Versión mayor antigua, usar 5.x |
| Redis | `6.x` | Versión antigua, usar 7.x |

---

## COMANDOS DE VERIFICACIÓN DEL ENTORNO

```powershell
# Ejecutar antes de empezar a desarrollar
node --version          # Debe ser v22.x.x
pnpm --version          # Debe ser 9.x.x
psql --version          # Debe ser 17.x
redis-cli ping          # Debe responder: PONG
stripe --version        # Debe ser > 1.20.x

# Verificar que los puertos están libres
netstat -ano | findstr ":3000 :4000 :5432 :6379"
# Si algún puerto aparece como LISTENING, encontrar y cerrar el proceso
```

---

*Documento generado: Mayo 2026 | Proyecto: NexCom | Universidad: UAGRM, Santa Cruz, Bolivia*
