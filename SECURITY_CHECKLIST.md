# Checklist de Seguridad — NexCom

> Revisión del checklist 5.7 del `PLAN_DESARROLLO.md`, verificada contra el código.
> Última revisión: Junio 2026.

Leyenda: ✅ cubierto · 🟡 cubierto parcialmente / con nota · 🔲 pendiente

---

## 1. ✅ Passwords nunca en logs ni respuestas GraphQL
El hash (`passwordHash`) no se expone en ningún `type` de GraphQL — `password` aparece
únicamente como **input** en `login`, `register` y `updatePassword`
([auth.typedefs.ts](backend/src/modules/auth/auth.typedefs.ts)). El hashing es con
`bcryptjs` (cost 12). En producción Prisma solo loguea `["error"]`, nunca queries con datos.

## 2. ✅ JWT secret aleatorio y largo
`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` se validan con Zod exigiendo **≥ 32 caracteres**
al arrancar; el servidor no inicia si no se cumple
([config/env.ts](backend/src/config/env.ts)). No hay valor por defecto en código.

## 3. ✅ Webhook de Stripe verifica firma antes de procesar
`stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` se ejecuta **antes**
de cualquier lógica; si la firma es inválida se responde 400 y se aborta
([index.ts](backend/src/index.ts), ruta `/webhooks/stripe`). El `rawBody` se preserva
para el cálculo de firma.

## 4. ✅ Operaciones de admin verifican rol ADMIN en el resolver
`requireAuth` / `requireRole(ctx, "ADMIN")` se invoca en cada resolver de
[admin](backend/src/modules/admin/admin.resolver.ts),
[config-sistema](backend/src/modules/config-sistema/config-sistema.resolver.ts) y reportes.
La autorización vive en el backend (fuente de verdad), no solo en la UI.

## 5. ✅ Sin SQL injection
Prisma parametriza todas las queries. Las pocas consultas `$queryRaw` (estadísticas de
ventas) usan **tagged templates** (`prisma.$queryRaw\`… ${valor}\``), que parametrizan los
valores — no hay concatenación de strings
([series-diaria.util.ts](backend/src/shared/series-diaria.util.ts) +
[admin.repository.ts](backend/src/modules/admin/admin.repository.ts)).

## 6. 🟡 Rate limiting
Implementado `@fastify/rate-limit` **global por IP: 300 req/min**, con `/health` y
`/webhooks/*` exentos ([rate-limit.plugin.ts](backend/src/plugins/rate-limit.plugin.ts)).
Esto protege `/graphql` (donde viven las mutaciones de auth) contra fuerza bruta y picos
automatizados a nivel de IP.
**Mejora pendiente:** límite granular por operación (p. ej. solo `login` a 5/min) —
requiere inspeccionar el cuerpo GraphQL o un plugin de complejidad/coste por operación.

## 7. 🟡 Datos sensibles no en URLs
Tokens de sesión (`accessToken`/`refreshToken`) viajan en el **body** de las mutaciones,
nunca en query string. El `authorization: Bearer` va en headers.
**Nota:** los tokens de verificación de email y reset de contraseña sí viajan en la URL del
enlace enviado por correo (patrón estándar de la industria); son de un solo uso y caducan
(24 h verificación, 2 h reset).

## 8. ✅ CORS restringido al origen del frontend
`corsPlugin` solo permite `FRONTEND_URL`, `localhost:3000` y los patrones `*.vercel.app` /
`*.railway.app` ([cors.plugin.ts](backend/src/plugins/cors.plugin.ts)). En producción se
rechaza cualquier otro origen.

## 9. ✅ Soft delete en datos históricos
Los productos no se borran: se marca `activo = false`. Las órdenes conservan un
**snapshot inmutable** de precio/nombre (`nombreSnapshot`, `precioUnitario`) y de la
dirección (`direccionSnapshot` JSON), por lo que el histórico no se altera aunque cambien
los datos originales.

## 10. ✅ Precios con Decimal, nunca float nativo
Todos los cálculos monetarios usan `decimal.js` (backend y frontend) y `Decimal(12,4)` en
PostgreSQL — sin errores de redondeo de punto flotante. Verificado en
[pagos.service.ts](backend/src/modules/pagos/pagos.service.ts),
[carrito](backend/src/modules/carrito/), [cupones](backend/src/modules/cupones/).

---

## Resumen

| # | Punto | Estado |
|---|-------|--------|
| 1 | Passwords fuera de logs/respuestas | ✅ |
| 2 | JWT secret robusto | ✅ |
| 3 | Firma de webhook Stripe | ✅ |
| 4 | Guards de rol ADMIN | ✅ |
| 5 | Sin SQL injection | ✅ |
| 6 | Rate limiting | 🟡 global por IP (falta granular por operación) |
| 7 | Datos sensibles fuera de URLs | 🟡 tokens de email en enlace (esperado) |
| 8 | CORS restringido | ✅ |
| 9 | Soft delete / snapshots | ✅ |
| 10 | Decimal en dinero | ✅ |

**8/10 completos, 2/10 con mejora documentada.** Ninguna brecha crítica abierta.

### Mejoras futuras (no bloqueantes)
- Rate limit granular por operación de auth (5/min para `login`).
- Cabeceras de seguridad HTTP (`@fastify/helmet`: CSP, HSTS, X-Frame-Options).
- Auditoría/log de acciones de admin (cambios de rol, desactivaciones).
- Rotación de refresh tokens con detección de reuso (ya hay rotación; falta alerta de reuso).
