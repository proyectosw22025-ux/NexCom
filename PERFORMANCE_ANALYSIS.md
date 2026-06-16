# Análisis de Rendimiento — NexCom (producción real, miles de usuarios)

> Análisis de ingeniería de rendimiento de nivel senior, fundamentado en código real y
> mediciones en producción. Objetivo: tiempo de respuesta óptimo y **cero fallos de
> respuesta/calidad/funcionalidad** salvo incidentes del proveedor cloud.
> Fecha: Junio 2026.

---

## 1. Resumen ejecutivo

El sistema es **funcionalmente sólido y sin N+1 a nivel de base de datos** (los repositorios
usan `include`/joins, no consultas por fila). El problema de "lentitud" percibida tiene **tres
causas reales y medibles**, en orden de impacto:

1. **Latencia de red de base (~0.5 s/req)** — el backend (Railway, región US) está lejos del
   usuario (Bolivia). Es el piso de *todas* las operaciones.
2. **Renderizado 100% en cliente (CSR)** — catálogo y detalle son `"use client"`; el usuario
   espera HTML → descarga JS → Apollo consulta → recién ve datos (cascada de 3 saltos).
3. **Round-trips innecesarios** — 28 queries usan `cache-and-network`, que siempre golpea la red
   aunque haya datos en caché.

El cuello de botita de cómputo del catálogo **ya se resolvió** (caché Redis: 1.8 s → 0.52 s).
Lo que queda es **arquitectura de latencia y escalabilidad**, no "bugs".

### Baseline medido (producción, sin keep-alive)
| Operación | Actual | Piso de red | Cómputo servidor |
|-----------|--------|-------------|------------------|
| `/health` | ~0.53 s | ~0.5 s | ~0 |
| `categorias` | ~0.52 s | ~0.5 s | ~0 (cache) |
| `productos` (catálogo) | ~0.52 s (hit) / ~1 s (miss) | ~0.5 s | ~0 (hit) ✅ ya optimizado |
| `login` | 0.9–1.3 s | ~0.5 s | 0.35–0.8 s (bcrypt) |
| cold start | 1.7–2.1 s | — | arranque contenedor |

---

## 2. Presupuesto de latencia (¿dónde se va el tiempo?)

Para una carga de catálogo en un navegador real (con keep-alive), el tiempo percibido se compone:

```
[ DNS + TLS (1ª vez) ] → [ HTML (Vercel edge, rápido) ] → [ descarga JS bundle ]
   → [ hidratación React ] → [ Apollo query → red → Railway US ] → [ render ]
        ~0.2-0.5s ────────────────────────────────────────┘
```

El gran problema del CSR: **los datos no empiezan a cargarse hasta que el JS se descarga y
ejecuta**. Con SSR/RSC, el HTML llegaría ya con los datos y cacheado en el edge de Vercel.

---

## 3. Análisis por capa (con evidencia y recomendaciones)

### 3.1 Red y Edge *(impacto: ALTO — afecta a TODAS las operaciones)*

**Hallazgo:** piso de ~0.5 s porque el backend está en una región US y el usuario en Bolivia; cada
request paga el RTT + (en conexiones nuevas) handshake TLS.

**Soluciones senior:**
- **Cloudflare delante del backend** (proxy + cache de respuestas GET cacheables en el edge más
  cercano al usuario). Reduce el RTT efectivo para lecturas públicas (catálogo, producto, categorías).
- **Elegir la región de Railway más cercana** a Latinoamérica (o un proveedor con presencia en SA).
- **HTTP/2 + keep-alive** garantizado: reutilizar conexión TLS elimina el handshake repetido
  (~0.3 s) en cada request. El navegador lo hace; verificar que el proxy/Railway no corte conexiones.
- **Edge caching de respuestas GraphQL GET** (queries idempotentes vía `GET` + `Cache-Control`)
  para que Cloudflare las sirva sin tocar el origen.

### 3.2 Renderizado del frontend *(impacto: ALTO — percepción de velocidad + SEO)*

**Hallazgos (código):**
- `productos/page.tsx` y `productos/[id]/page.tsx` son `"use client"` → CSR puro.
- **28 usos de `fetchPolicy: "cache-and-network"`** → re-consulta la red en cada montaje aunque haya
  caché en memoria de Apollo.
- No se usa Apollo en RSC (todo el data-fetching es client-side).

**Soluciones senior:**
- **Migrar catálogo y detalle a React Server Components (RSC)** con fetch en el servidor:
  - HTML llega con datos → First Contentful Paint inmediato.
  - Cacheable en el edge de Vercel (`revalidate` / ISR) → miles de usuarios servidos desde CDN
    sin tocar el backend.
  - Mejora SEO (hoy el catálogo es invisible para crawlers).
- **Afinar políticas de Apollo:** usar `cache-first` para datos estables (categorías, detalle de
  producto) y reservar `cache-and-network` solo donde la frescura es crítica (carrito, órdenes,
  notificaciones). Hoy está al revés (28 vs 1).
- **Streaming SSR / Suspense**: enviar el shell y "stream" de las secciones según llegan.
- **Prefetch en hover** de links de producto (`next/link` ya prefetch del JS; añadir prefetch de datos).

### 3.3 Capa GraphQL/API *(impacto: MEDIO-ALTO)*

**Hallazgos:**
- Catálogo **ya cacheado** en Redis (✅ hecho). `getById` y `categorias` también.
- El catálogo usa `include` completo: trae el **registro entero de `vendedor`** por producto
  (todas las columnas) aunque la tarjeta solo necesite nombre/ciudad/rating.
- No hay **límite de complejidad/profundidad** de query → un cliente malicioso podría pedir
  consultas anidadas costosas.
- No hay **persisted queries** (cada request envía el texto completo del query).

**Soluciones senior:**
- **`select` en vez de `include`** en el catálogo: traer solo los campos que la UI consume →
  menos bytes, menos serialización, menos transferencia.
- **Límite de profundidad y costo de query** (`graphql-depth-limit` / cost analysis) — protege el
  backend de queries abusivas a escala.
- **Automatic Persisted Queries (APQ)**: el cliente envía un hash en vez del query completo →
  menos payload y permite cache en CDN por hash.
- **Response cache plugin de Yoga** con TTL por tipo, complementando el caché manual de Redis.
- **DataLoader** preventivo: si en el futuro se agregan field-resolvers que consulten (ej.
  `Producto.ratingPromedio` calculado), batchearlos para no reintroducir N+1.

### 3.4 Base de datos *(impacto: ALTO a escala)*

**Hallazgos:**
- **Prisma sin configuración de pool** (`@prisma/adapter-pg` con defaults). Con miles de usuarios
  concurrentes, el pool puede agotarse y Postgres tiene un `max_connections` limitado (Railway
  hobby ~20-100).
- Índices existen para órdenes (`(estado, creado_en)`, etc.) y reportes; el catálogo ordena por
  `(destacado DESC, creadoEn DESC)` — **verificar índice compuesto** que lo cubra.
- Búsqueda por nombre probablemente hace `ILIKE %term%` (scan secuencial).

**Soluciones senior:**
- **Connection pooling explícito**: alinear `connection_limit` del pool con `max_connections` de
  Postgres; ante muchas instancias, poner **PgBouncer** (o el pooler de Railway/Supabase) en modo
  *transaction* para multiplexar conexiones.
- **Índice compuesto** `(activo, destacado DESC, creado_en DESC)` para el `orderBy` del catálogo.
- **Búsqueda con `pg_trgm`** (índice GIN trigram) → búsqueda por similitud rápida y tolerante a
  errores, en vez de `ILIKE` con scan.
- **Read replicas** cuando el tráfico de lectura domine: dirigir queries de catálogo/búsqueda a
  réplicas de solo-lectura.
- **`EXPLAIN ANALYZE`** sobre las queries calientes para confirmar uso de índices.

### 3.5 Estrategia de caché *(impacto: ALTO)*

**Hallazgos:** caché por clave en Redis (catálogo, producto, categorías, búsqueda) con TTL e
invalidación por patrón. Degrada con gracia si Redis cae (✅ `getFromCache` atrapa el error).

**Soluciones senior:**
- **Stale-While-Revalidate**: servir el valor cacheado aunque esté vencido y refrescar en segundo
  plano → el usuario nunca espera el "cache miss".
- **Protección contra cache stampede**: con TTL fijo, al expirar el catálogo *todos* los requests
  concurrentes pegan a la DB a la vez (lo vimos: el 1er request post-deploy tardó 2.1 s). Mitigar
  con *jitter* en el TTL + *lock* de regeneración (un solo request reconstruye, el resto espera el
  valor).
- **Capas de caché**: edge (Cloudflare/Vercel) → Redis → DB. Cuanto más cerca del usuario, mejor.
- **Invalidación quirúrgica** (ya se hace por patrón) — vigilar que `KEYS pattern` no escale mal en
  Redis grande; preferir índices de claves o `SCAN`.

### 3.6 Redis a escala *(impacto: MEDIO)*

**Hallazgos:** una conexión de comandos + dos dedicadas a pub/sub (correcto). Upstash tiene límites
de comandos/conexiones por plan.

**Soluciones senior:**
- **Pipelining** de comandos cuando se leen varias claves.
- Vigilar **límites del plan Upstash** (req/s, conexiones) — a miles de usuarios concurrentes con
  subscriptions, el fan-out de pub/sub crece; considerar plan dedicado o Redis Cluster.

### 3.7 Tiempo real / WebSockets *(impacto: MEDIO a escala)*

**Hallazgo:** cada usuario conectado mantiene un WS + una suscripción Redis (`notificacion:userId`).

**Soluciones senior:**
- A miles de conexiones simultáneas, **una sola instancia satura** (memoria/FD). Requiere
  **escalado horizontal con sticky sessions** o un gateway de WS dedicado; el pub/sub por Redis ya
  permite que varias instancias compartan eventos.
- Considerar **límite de conexiones por IP** y *heartbeat*/timeout para limpiar conexiones zombi.

### 3.8 Autenticación / bcrypt *(impacto: MEDIO en login)*

**Hallazgo:** `bcrypt.compare` con cost 12 en CPU compartida = 0.35–0.8 s del login.

**Soluciones senior:**
- **Rehash-on-login** bajando a cost 10–11 (OWASP) sin invalidar hashes existentes (se recalcula al
  iniciar sesión). Reduce el costo de CPU del login ~2-4×.
- El login ya se optimizó de 3→2 queries (commit previo).

### 3.9 Cold start *(impacto: ALTO en plan Hobby)*

**Hallazgo:** primera petición tras inactividad ~1.7–2.1 s (arranque del contenedor + reconexión DB).

**Soluciones senior:**
- **Health-ping** externo (UptimeRobot/cron) cada 4 min sobre `/health` para mantener caliente.
- **Plan always-on** para producción real (el Hobby duerme) — *este es el "tema de servicio cloud"*
  que sí justifica costo.
- Acelerar arranque: el `prisma.$connect()` y `redis.connect()` ya son no bloqueantes (✅).

---

## 4. Escalar a miles de usuarios

### 4.1 Escalado horizontal (stateless)
- El backend es casi *stateless* (JWT, sin sesión en memoria) → **se puede replicar en N
  instancias** detrás de un balanceador. ✅ buena base.
- **Bloqueador detectado:** el **rate-limit está en memoria** (default de `@fastify/rate-limit`).
  Con varias instancias, cada una cuenta por separado → límite inconsistente y evadible.
  **Solución:** store **Redis** para el rate-limit (compartido entre instancias).
- **Cron de ofertas con `setInterval`** dentro del proceso: con N instancias se ejecuta N veces.
  **Solución:** mover a un job único (lock en Redis, o un worker/cron externo).

### 4.2 Capacidad y autoscaling
- Definir **autoscaling** por CPU/memoria en Railway.
- **Prueba de carga** (el `k6/load-test.js` ya existe) desde múltiples IPs para validar 100→1000 VUs.
- Dimensionar **pool de DB** y **plan de Redis** según la prueba.

### 4.3 Imágenes y estáticos
- `next/image` ya se usa (✅) con `remotePatterns: "**"`. A escala conviene **CDN dedicado**
  (Cloudinary/ImageKit) con transformaciones y `srcset`, y bloquear hosts arbitrarios por seguridad.

---

## 5. Confiabilidad ("no debería fallar salvo el cloud")

Para garantizar respuesta y calidad bajo carga:

- **Timeouts y reintentos** en llamadas salientes (Stripe, mailer) con *backoff*.
- **Degradación elegante** (ya presente): si Redis cae, el sitio sigue (sin caché). Extender el
  patrón a todas las dependencias no críticas.
- **Idempotencia** en el webhook de Stripe (ya verifica firma; añadir clave de idempotencia para
  no procesar el mismo evento dos veces ante reintentos).
- **Circuit breaker** hacia dependencias externas para no propagar fallos.
- **Límites de payload y de complejidad de query** (anti-abuso).
- **Health checks profundos** (DB + Redis) ya implementados en `/health` (✅).

---

## 6. Observabilidad (imprescindible para sostenerlo)

> Hoy las métricas se obtienen a mano. A escala, esto es ciego.

- **Logs estructurados** con request-id (Pino, ya hay logger de Fastify).
- **Métricas por operación GraphQL** (latencia P50/P95/P99, tasa de error) vía plugin de Yoga.
- **APM / tracing distribuido** (OpenTelemetry → Grafana/Datadog) para ver el salto frontend→API→DB.
- **Error tracking** (Sentry) en frontend y backend.
- **Alertas** sobre SLOs (P95, error rate, saturación de pool/conexiones).
- **Dashboard** de salud en tiempo real.

---

## 7. Plan de acción priorizado (impacto / esfuerzo)

| Prioridad | Acción | Impacto | Esfuerzo | Ganancia esperada |
|-----------|--------|---------|----------|-------------------|
| 🔴 P0 | Caché de catálogo en Redis | Alto | — | **HECHO** (1.8s→0.52s) |
| 🔴 P0 | Health-ping anti cold-start | Alto | Bajo | elimina 1.7-2.1 s ocasional |
| 🔴 P0 | Rate-limit con store Redis | Crítico p/ escalar | Bajo | habilita multi-instancia |
| 🟠 P1 | RSC/SSR + edge cache en catálogo y detalle | Alto | Medio | TTFB con datos, CDN, SEO |
| 🟠 P1 | Cloudflare delante del backend | Alto | Medio | ataca el piso de ~0.5 s |
| 🟠 P1 | Rehash-on-login (bcrypt 12→10) | Medio | Bajo | login ~0.9s→~0.6s |
| 🟠 P1 | Pool de DB explícito + PgBouncer | Alto a escala | Medio | evita agotamiento de conexiones |
| 🟡 P2 | `select` en catálogo (vs include) | Medio | Bajo | menos payload/serialización |
| 🟡 P2 | Afinar fetchPolicy (cache-first) | Medio | Bajo | menos round-trips |
| 🟡 P2 | Stale-while-revalidate + anti-stampede | Medio | Medio | sin picos en cache miss |
| 🟡 P2 | Cron de ofertas fuera del proceso | Medio a escala | Bajo | correcto con N instancias |
| 🟡 P2 | Índice compuesto catálogo + `pg_trgm` búsqueda | Medio | Bajo | queries sin scan |
| 🟢 P3 | Observabilidad (logs/métricas/Sentry/APM) | Alto (operación) | Medio | sostenibilidad |
| 🟢 P3 | Límite de complejidad/profundidad + APQ | Medio | Medio | anti-abuso, menos payload |
| 🟢 P3 | CDN de imágenes dedicado | Medio | Medio | imágenes rápidas a escala |

---

## 8. SLOs objetivo (producción real)

| Métrica | Objetivo |
|---------|----------|
| P95 catálogo (cache hit, vía edge) | < 300 ms |
| P95 catálogo (cache miss) | < 800 ms |
| P95 detalle de producto | < 400 ms |
| P95 login | < 600 ms |
| Error rate (5xx + GraphQL) | < 0.1 % |
| Disponibilidad | > 99.9 % |
| Throughput sostenido | 1000+ req/s (con autoscaling) |
| TTFB catálogo (SSR + edge) | < 200 ms |

---

## 9. Conclusión

NexCom tiene **bases correctas** para escalar: backend stateless, sin N+1 de DB, caché con
degradación elegante, pub/sub distribuible. Los tres bloqueadores reales para "miles de usuarios sin
fallos" son **(1) latencia de red por región/CSR, (2) rate-limit en memoria, y (3) cold-start**, los
tres con solución conocida y de bajo-medio esfuerzo. Atacando P0+P1 se llega a un producto con
tiempos de respuesta competitivos y listo para escalar horizontalmente; lo demás (P2/P3) es
profundización y operación sostenible.

*Las únicas latencias no eliminables por código son las inherentes al proveedor cloud (RTT de
región, límites de plan), justamente las que el usuario aceptó como excepción.*
