# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es NexCom

Marketplace local boliviano (Santa Cruz) para microempresas. Monorepo con dos apps independientes que se comunican por **GraphQL**:

- `frontend/` — Next.js 15 (App Router) + React 19 + Apollo Client + Tailwind 4
- `backend/`  — Fastify + GraphQL Yoga + Prisma 7 (PostgreSQL) + Redis + Stripe + BullMQ

Tres roles: `CLIENTE`, `VENDEDOR`, `ADMIN`. Un cuarto flujo, "Recoge NexCom" (`/recoge`), es una PWA offline-first para puntos de retiro.

## Comandos

### Frontend (`cd frontend`)
```bash
npm run dev          # dev server con Turbopack (localhost:3000)
npm run build        # build de producción (Turbopack)
npm run lint         # eslint
npm run test         # vitest run (una pasada)
npm run test:watch   # vitest en watch
npx vitest run src/lib/utils.test.ts   # un solo archivo de test
```

### Backend (`cd backend`)
```bash
npm run dev              # tsx watch src/index.ts (localhost:4000/graphql, GraphiQL en dev)
npm run build            # prisma generate && tsc
npm run type-check       # tsc --noEmit
npm run test             # vitest run
npm run test:coverage    # vitest run --coverage
npx vitest run src/modules/ordenes/ordenes.service.test.ts   # un solo test

npm run db:migrate       # prisma migrate dev
npm run db:migrate:reset # reset destructivo de la BD
npm run db:studio        # Prisma Studio
npm run db:seed          # datos de ejemplo (src/scripts/seed-data.ts)
npm run db:seed:admin    # crea el usuario admin
```

Infra local: `docker-compose.yml` levanta Postgres/Redis; `docker-compose.full.yml` levanta el stack completo.

## Cómo se comunican frontend y backend

Todo pasa por un único endpoint GraphQL (`/graphql`). El **frontend consume esa API por dos caminos distintos** — entender cuál se usa y por qué es la clave del proyecto:

1. **Apollo Client** (navegador, Client Components) — `frontend/src/lib/apollo-client.ts`.
   - `authLink` inyecta `Authorization: Bearer <token>` leyendo el access token de `localStorage`.
   - `errorLink`: ante un error GraphQL con `code === "UNAUTHENTICATED"` borra tokens + cache y redirige a `/login`.
   - `split()` enruta las **subscriptions** por WebSocket (`graphql-ws`) y todo lo demás por HTTP.
   - El `InMemoryCache` se **persiste en localStorage** (`apollo3-cache-persist`) para que "Recoge" muestre saldo/pedidos sin red.

2. **`gqlFetchCacheable`** (Server Components / SSR) — `frontend/src/lib/graphql-server.ts`.
   - Corre en el servidor de Next, sin token, para **datos públicos** (catálogo, categorías, detalle de producto).
   - Usa GraphQL por **GET** a propósito: así la respuesta entra en el Data Cache de Next (`export const revalidate = N`) y se cachea en el edge de Vercel. POST no se cachea.

Regla mental: **datos públicos y cacheables → Server Component + `gqlFetchCacheable`; datos privados/interactivos → Client Component + Apollo**. Sólo 4 `page.tsx` son server components; ~51 componentes llevan `"use client"`.

### Autenticación y protección de rutas
- Tras login, `AuthContext` (`frontend/src/context/auth-context.tsx`) guarda `nexcom_access_token` + `nexcom_refresh_token` en localStorage y espeja el rol en la cookie `nexcom_rol`.
- El **access token se refresca solo cada 13 min**; al restaurar sesión intenta `me`, y si falla usa el refresh token.
- `frontend/src/middleware.ts` protege `/vendedor`, `/admin`, `/cliente` **leyendo la cookie `nexcom_rol`** (el middleware no puede leer localStorage). Esto es solo UX/redirección: la autorización real vive en el backend.

## Arquitectura del backend (por módulos)

Cada dominio en `backend/src/modules/<x>/` sigue el mismo patrón de capas:
- `*.typedefs.ts` — SDL de GraphQL (types, Query, Mutation, Subscription) de ese módulo.
- `*.resolver.ts` — resuelve los campos; **empieza llamando a `requireRole`/`requireAuth`** (guards en `shared/guards.ts`) y delega en el service.
- `*.service.ts` — lógica de negocio (transacciones Prisma, reglas, cálculos con `decimal.js`).
- `*.repository.ts` — acceso a datos con Prisma (no en todos los módulos).
- `*.test.ts` — tests con Vitest.

Todos los typedefs se fusionan en `backend/src/graphql/schema.ts` (`mergeTypeDefs`) y los resolvers en `backend/src/graphql/resolvers.ts` (`mergeResolvers`). Para agregar un feature: crear el módulo y registrarlo en esos dos archivos.

### Ensamblado del servidor (`backend/src/index.ts`)
Fastify monta: GraphQL Yoga en `/graphql`, un `WebSocketServer` para subscriptions (auth resuelta en `onConnect`), el webhook de Stripe (`/webhooks/stripe`, verifica firma, idempotente por CAS sobre el estado de la orden), `/health`, y **crons con lock distribuido** (`runWithLock`) para barrido de escrow y estados de ofertas, de modo que con N instancias solo una ejecuta el job.

El **contexto GraphQL** (`NexComContext`) se arma por request desde el header Bearer → `{ user, ip, prisma, redis, stripe }`, y `user` lleva `perfilCompradorId`/`perfilVendedorId` que los resolvers usan para aislar datos por dueño.

## Convenciones importantes
- **Dinero siempre con `decimal.js`** (nunca `number`); los campos monetarios viajan como `String` en el schema GraphQL.
- Los alias de import del frontend usan `@/` → `frontend/src/`.
- El backend usa ESM: los imports internos llevan extensión `.js` aunque el fuente sea `.ts`.
- Errores de negocio se lanzan como `GraphQLError` con `extensions.code` (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, …); solo los inesperados van a Sentry.
- Tema visual: `data-theme`/`data-skin` se fijan en `<head>` antes del primer paint (script inline en `layout.tsx`) para evitar parpadeo; preferencias en `ui-prefs-context.tsx`. Design system y direcciones de UI documentadas en las skills `/diseño-pro`, `/ux-pro`, `/retoque-ui`.

## Documentación existente
Los planes por sprint/fase están en la raíz: `PLAN_DESARROLLO.md`, `PLAN_FASE2..5*.md`, `ANALISIS_TECNICO_NEXCOM.md`, `DATABASE.md` (esquema), `STACK.md`, `PERFORMANCE_ANALYSIS.md`, `SECURITY_CHECKLIST.md`.
