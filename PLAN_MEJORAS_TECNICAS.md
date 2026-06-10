# Plan de Mejoras Técnicas / Infraestructura — NexCom
> Basado en los hallazgos de `ANALISIS_TECNICO_NEXCOM.md`
> Enfoque: calidad de código, testing, CI/CD y despliegue (complementa `PLAN_FASE2_MEJORAS.md`, que cubre UX/UI)

## ESTADO DE IMPLEMENTACIÓN (actualizado)

| Etapa | Estado | Detalle |
|---|---|---|
| 1 — Calidad de código (Prettier) | Pendiente | No implementado aún |
| 2 — Testing | **Implementado (base)** | Vitest configurado en `frontend/` y `backend/` con tests reales (`auth.service`, `ordenes.service`, `utils.cn`, `Badge`). Falta ampliar cobertura (k6, más servicios) |
| 3 — CI/CD | Pendiente | No implementado aún |
| 4 — Docker (entorno reproducible) | **Implementado** | `docker-compose.yml` (Postgres+Redis) y `docker-compose.full.yml` (stack completo con Dockerfiles de backend/frontend) |
| 5.1 — Rate limiting | Pendiente | No implementado aún |
| 5.2 — Health check | **Implementado** | `GET /health` en `backend/src/index.ts` |
| 5.3 — Checklist seguridad | Pendiente | No implementado aún |
| 6 — Docs de despliegue | Pendiente | No implementado aún |

Ver sección "Testing y Docker (implementado)" al final de este documento para el detalle de uso.

---

## DIAGNÓSTICO DE PARTIDA

El análisis técnico del proyecto identificó los siguientes vacíos de infraestructura,
todos verificados por ausencia de archivos/configuración en el repositorio:

| # | Hallazgo | Riesgo |
|---|---|---|
| 1 | **No hay testing configurado** (sin Jest/Vitest/Cypress) | Regresiones silenciosas en módulos críticos (pagos, auth, órdenes) |
| 2 | **No hay CI/CD** (sin GitHub Actions) | Errores de build/tipos solo se detectan en Vercel/Railway, no antes del merge |
| 3 | **No hay Prettier** configurado | Inconsistencia de formato entre colaboradores |
| 4 | **URL de producción no verificada/documentada** | Imposible validar el despliegue real para la entrega académica |
| 5 | **Sin Docker/docker-compose** | Onboarding de nuevos desarrolladores requiere instalar Postgres/Redis manualmente |
| 6 | **Sin rate limiting confirmado** en mutaciones de auth (`@fastify/rate-limit` no está en `package.json`) | Expuesto a fuerza bruta en login/registro |
| 7 | **Sin health-check endpoint** documentado para Railway | Railway no puede verificar que el backend está vivo de forma confiable |

---

## ETAPA 1 — Calidad de código base (rápido, bajo riesgo)
**Duración estimada:** 1 día | **Prioridad: ALTA**

### 1.1 — Prettier
- Instalar `prettier` + `eslint-config-prettier` en `frontend/` y `backend/`
- Crear `.prettierrc` compartido en la raíz (semi: true, singleQuote: false, printWidth: 100)
- Agregar script `"format": "prettier --write ."` en ambos `package.json`
- Integrar con ESLint (`eslint-config-prettier` para evitar conflictos de reglas)

### 1.2 — Scripts de verificación unificados
- Backend: agregar `"lint": "eslint src --ext .ts"` (actualmente no existe)
- Documentar en `README.md` el flujo: `npm run type-check && npm run lint && npm run format`

---

## ETAPA 2 — Testing (cierra el gap de QA del Sprint 5)
**Duración estimada:** 4-5 días | **Prioridad: ALTA**

### 2.1 — Backend: Vitest + mocks de Prisma
- Instalar `vitest`, `vitest-mock-extended`, `@vitest/coverage-v8`
- Crear `backend/vitest.config.ts`
- Tests prioritarios (servicios con lógica de negocio crítica):
  - `auth.service.test.ts` — registro, login, refresh token, expiración
  - `pagos.service.test.ts` — creación de PaymentIntent, manejo de webhook (mock de Stripe)
  - `ordenes.service.test.ts` — transición de estados según máquina de estados
  - `valoraciones.service.test.ts` — reglas de creación (solo post-compra)
- Cobertura objetivo: 60% en `modules/*/  *.service.ts`

### 2.2 — Frontend: Vitest + Testing Library
- Instalar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Tests de componentes críticos: `CartDrawer`, formularios de auth (validación Zod), `CheckoutStepper` (si se implementa en Fase 2 de UX)

### 2.3 — Script de carga (k6)
- `backend/k6/load-test.js` con escenarios de navegación/búsqueda/checkout (distribución 40/30/20/10 ya prevista en `PLAN_DESARROLLO.md`)
- Ejecutar contra entorno de staging antes de la entrega final

---

## ETAPA 3 — CI/CD con GitHub Actions
**Duración estimada:** 1-2 días | **Prioridad: ALTA**

### 3.1 — Workflow de verificación (`.github/workflows/ci.yml`)
En cada push/PR a `master`:
- Job `frontend`: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
- Job `backend`: `npm ci`, `prisma generate`, `npm run type-check`, `npm run lint`, `npm test` (Etapa 2)
- Usar matriz de Node 22.x (consistente con `engines` de `frontend/package.json`)

### 3.2 — Validación de migraciones Prisma
- Job adicional que corre `prisma migrate diff` contra una base PostgreSQL de servicio (GitHub Actions service container) para detectar migraciones rotas antes del merge

### 3.3 — Despliegue
- Vercel y Railway ya soportan auto-deploy por integración Git nativa — **no requiere workflow adicional**, solo documentar en `README.md` que el CI debe pasar en verde antes de mergear a `master` (rama de la que ambas plataformas despliegan)

---

## ETAPA 4 — Entorno de desarrollo reproducible
**Duración estimada:** 1 día | **Prioridad: MEDIA**

### 4.1 — `docker-compose.yml` (solo para dependencias, no para la app)
```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: nexcom_dev
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
  redis:
    image: redis:7.2-alpine
    ports: ["6379:6379"]
```
- Permite a nuevos desarrolladores levantar Postgres+Redis locales con `docker compose up -d` sin instalar nada en el sistema
- El backend y frontend siguen corriendo nativos con `npm run dev` (no se dockeriza la app, solo infraestructura)

### 4.2 — Documentar setup en `README.md`
- Pasos: clonar → `docker compose up -d` → copiar `.env.example` → `npm run db:migrate` → `npm run db:seed` → `npm run dev`

---

## ETAPA 5 — Seguridad y robustez del backend
**Duración estimada:** 2 días | **Prioridad: MEDIA-ALTA**

### 5.1 — Rate limiting
- Instalar `@fastify/rate-limit`
- Aplicar límites estrictos en `auth.resolver.ts` (login, registro, recuperación de contraseña): ej. 5 intentos / 15 min por IP

### 5.2 — Health check endpoint
- `GET /health` en `backend/src/index.ts`: verifica conexión a Postgres (Prisma `$queryRaw`) y Redis, responde `200 OK` / `503`
- Necesario para que Railway marque el servicio como saludable y reinicie si falla

### 5.3 — Checklist de seguridad (Sprint 5.7 del plan original)
- Crear `SECURITY_CHECKLIST.md` con los 10 puntos del `PLAN_DESARROLLO.md`, marcando estado real:
  - Validación de inputs (Zod) ✓
  - Rate limiting (pendiente hasta 5.1)
  - CORS restrictivo ✓ (ya implementado)
  - Hash de contraseñas (bcrypt) ✓
  - Webhook signature validation (Stripe) ✓
  - Secrets fuera del repo (`.env` en `.gitignore`) ✓
  - JWT con expiración corta + refresh ✓
  - Manejo de errores sin exponer stack traces en producción (verificar)
  - Validación de roles en cada resolver sensible (auditar)
  - Logs de auditoría en acciones admin (verificar tabla `historial_estados_orden`, evaluar si falta log de acciones admin)

---

## ETAPA 6 — Documentación de despliegue
**Duración estimada:** 0.5 día | **Prioridad: ALTA (para entrega académica)**

### 6.1 — Verificar y documentar URLs reales
- Confirmar URL activa de Vercel (frontend) y Railway (backend)
- Confirmar que `NEXT_PUBLIC_GRAPHQL_URL` en Vercel apunta correctamente al backend de Railway
- Confirmar que `FRONTEND_URL` en Railway apunta al dominio real de Vercel (usado por CORS y emails)

### 6.2 — Actualizar `ANALISIS_TECNICO_NEXCOM.md`
- Reemplazar la sección "Pendiente de confirmar" con las URLs reales una vez verificadas
- Agregar capturas o evidencia del despliegue funcionando (para el PDS)

---

## ORDEN RECOMENDADO DE EJECUCIÓN

```
1. ETAPA 1 (Prettier/lint)       ← base para que CI tenga sentido
2. ETAPA 3 (CI/CD)                ← detecta errores temprano en el resto de etapas
3. ETAPA 2 (Testing)              ← se integra directo al CI ya creado
4. ETAPA 5 (Seguridad backend)    ← rate limiting + health check, alto impacto/bajo esfuerzo
5. ETAPA 6 (Docs de despliegue)   ← cierre formal para el PDS
6. ETAPA 4 (Docker dev)           ← mejora de DX, no bloquea entrega
```

---

---

## Testing y Docker (implementado)

### Testing — Vitest

**Backend** (`backend/`):
```bash
npm test          # corre todos los tests una vez
npm run test:watch
npm run test:coverage
```
- `vitest.config.ts` carga `.env.test` (valores dummy válidos contra el schema Zod de `config/env.ts`).
- Tests: `src/modules/auth/auth.service.test.ts` (login: éxito, credenciales inválidas,
  cuenta desactivada, email no verificado), `src/modules/ordenes/ordenes.service.test.ts`
  (máquina de estados `avanzarEstado`: transiciones válidas/ inválidas, orden no encontrada).
- Prisma se mockea con `vitest-mock-extended` / `vi.mock` sobre los repositorios — no requiere
  base de datos real.

**Frontend** (`frontend/`):
```bash
npm test
npm run test:watch
```
- `vitest.config.ts` usa `jsdom` + `@testing-library/react`, alias `@/ -> src/`.
- Tests: `src/lib/utils.test.ts` (`cn()`), `src/components/ui/Badge.test.tsx` (variantes,
  label, dot, tamaños).

Patrón a seguir para nuevos tests: un `*.service.test.ts` por módulo backend mockeando su
`*.repository.ts`, y un `*.test.tsx` por componente presentacional nuevo en frontend.

### Docker

Dos archivos compose, pensados para no romper el flujo de desarrollo (hot-reload) y a la vez
ofrecer un stack 100% reproducible:

**1. Desarrollo diario** — solo Postgres 17 + Redis 7.2:
```bash
docker compose up -d
# backend/.env y frontend/.env.local apuntan a localhost:5432 / localhost:6379
cd backend && npm run db:migrate && npm run dev
cd frontend && npm run dev
```

**2. Stack completo** (backend + frontend dockerizados, demo/QA/entrega):
```bash
cp .env.example .env   # completar NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY desde frontend/.env.local
docker compose -f docker-compose.yml -f docker-compose.full.yml up --build
```
- Frontend: http://localhost:3000
- Backend GraphQL: http://localhost:4000/graphql
- Health check: http://localhost:4000/health

Detalles de diseño:
- `backend/Dockerfile` y `frontend/Dockerfile` son multi-stage sobre `node:22-slim` (evita
  problemas de binary targets de Prisma con Alpine/musl).
- `frontend/next.config.ts` usa `output: "standalone"` (imagen mínima, patrón oficial de Next.js).
- Variables `NEXT_PUBLIC_*` se pasan como build `args` (se incrustan en el bundle del navegador).
- `backend` reutiliza los secretos de `backend/.env` vía `env_file`, sobreescribiendo solo
  `DATABASE_URL`/`REDIS_URL`/`FRONTEND_URL` para apuntar a los servicios internos de Docker.
- `npm start` del backend ejecuta `prisma migrate deploy` automáticamente al arrancar el contenedor.

---

*NexCom — Plan de Mejoras Técnicas | Generado a partir de `ANALISIS_TECNICO_NEXCOM.md` | Junio 2026*
