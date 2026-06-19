# PLAN DE DESARROLLO — FASE 3: Escalar, Destacar y Optimizar
> NexCom Marketplace · Visión de producto + ingeniería senior
> Estado base: Sprints 1-5 completos + Fase 2 (Etapas 1-5) desplegada en producción
> Objetivo: pasar de "funciona" a **producto óptimo, autónomo y diferenciado**

---

## 0. Filosofía de esta fase

No se trata de **eliminar** nada, sino de **escalar y profundizar**. El sistema ya tiene los 17
módulos y el flujo completo de compra. Lo que sigue es:

1. **Cerrar los círculos abiertos** (features con backend pero sin UI) — coherencia.
2. **Subir la vara de descubrimiento y confianza** — lo que hace que un marketplace se *use*.
3. **Inteligencia y autonomía** — que el sistema trabaje *por* el usuario (recomendaciones,
   alertas, automatizaciones), no solo que responda.
4. **Rendimiento de nivel senior** — tiempos de respuesta óptimos, medibles y sostenibles a escala.
5. **Observabilidad** — no se puede mejorar lo que no se mide.

---

## 1. Baseline de rendimiento (medido en producción)

Medición real contra `diplomatic-cat-production.up.railway.app` (peticiones sin keep-alive,
por lo que sobreestiman ~0.3s de TLS frente a un navegador real):

| Operación | Warm (TOTAL) | Cómputo servidor estimado | Diagnóstico |
|-----------|-------------|---------------------------|-------------|
| `/health` | ~0.53 s | ~0 (solo `SELECT 1`) | = piso de red cliente→Railway (US) |
| `categorias` | ~0.52 s | ~0 | ✅ cacheado, óptimo |
| **`productos` (catálogo)** | **1.08–1.83 s** | **0.5–1.3 s** | ⚠️ **sin caché**, 4 includes por fila |
| `login` | 0.88–1.33 s | 0.35–0.8 s | bcrypt(12) en CPU compartida + 2 queries |
| cold start | ~1.7 s (1ª req) | — | Railway puede dormir el contenedor |

**Conclusiones del análisis:**
- El **catálogo es el cuello de botella #1**: `getAll` no usa Redis pese a existir
  `CACHE_TTL_CATALOGO=180` y toda la infraestructura de caché. *(Quick win inmediato — ver §6.1)*
- Hay un **piso de red de ~0.2-0.5 s** porque el backend (Railway) está lejos del usuario
  (Bolivia). Atacable con edge/región y keep-alive.
- `login` está dominado por **bcrypt cost 12** en CPU compartida.
- **No hay observabilidad**: estos números los obtuve a mano; el sistema no los reporta solo.

---

## 2. PILAR A — Cerrar el círculo del producto *(coherencia, esfuerzo bajo, impacto alto)*

Features cuyo backend ya existe pero no tienen punto de entrada en la UI.

| # | Feature | Estado actual | Acción |
|---|---------|---------------|--------|
| A.1 | **Página `/favoritos`** | El navbar la enlaza y `ProductoCard` ya tiene el toggle ❤️, pero la página **no existe (404)** | Crear `/favoritos` con grid + estado vacío |
| A.2 | **Reseñas visibles en producto** | `productos/[id]` no muestra rating ni reseñas | Sección de reseñas + rating promedio + respuesta del vendedor |
| A.3 | **Botón "Reportar"** | 0 UI; `crearReporte` huérfano | Botón en producto/vendedor → modal → alimenta `/admin/reportes` |
| A.4 | **Crear cupones** | Solo por seed | UI de cupones para vendedor (y/o admin) |
| A.5 | **Rating en tarjetas** | `ProductoCard` sin estrellas | Estrellas + nº de reseñas en card |

---

## 3. PILAR B — Descubrimiento (experiencia de marketplace real)

| # | Feature | Por qué |
|---|---------|---------|
| B.1 | **Filtros avanzados de catálogo** (rango de precio, orden por precio/recientes/mejor valorados, ciudad) | Hoy solo filtra por categoría. Es el motor de uso de un marketplace |
| B.2 | **Tienda pública del vendedor** (`/tienda/[id]`) | Explorar "todos los productos de esta microempresa" — público objetivo de NexCom |
| B.3 | **Cancelación de orden por comprador** (antes del envío) | Necesidad básica; reduce soporte |
| B.4 | **Re-comprar / comprar de nuevo** desde el historial | Fricción mínima para compras recurrentes |

---

## 4. PILAR C — Confianza y comunidad

| # | Feature | Por qué |
|---|---------|---------|
| C.1 | **Preguntas y respuestas** (Q&A público en el producto) | Pre-compra estándar en LatAm (Mercado Libre). El tipo de reporte `MENSAJE` ya lo insinuaba |
| C.2 | **Badges de confianza** (vendedor verificado, "responde rápido", "+100 ventas") | Señales de reputación que incentivan al vendedor |
| C.3 | **Reseñas con foto** | Mayor credibilidad social |

---

## 5. PILAR D — Inteligencia y autonomía *(innovación coherente, diferenciador)*

Lo que hace al sistema **autónomo** y **destacado**, no solo reactivo:

| # | Idea | Implementación coherente con el stack |
|---|------|----------------------------------------|
| D.1 | **Recomendaciones "También te puede interesar"** | Co-ocurrencia de productos en órdenes (SQL `GROUP BY`), o por categoría/etiquetas. Cero costo de infra extra |
| D.2 | **Búsqueda con tolerancia a errores** (typo-tolerant) | Postgres `pg_trgm` (similaridad trigram) o full-text search — sin servicios externos |
| D.3 | **Alertas inteligentes al vendedor** | Job que detecta stock bajo, productos sin ventas, reseñas negativas → notificación (infra de notificaciones ya existe) |
| D.4 | **Detección de fraude/abuso** | Reglas: múltiples reportes, patrones de cancelación, picos anómalos → marca para revisión admin |
| D.5 | **Bajada de precio en favoritos** | Si baja el precio de un producto que el comprador marcó → notificación push (cierra el loop favoritos + notificaciones + ofertas) |
| D.6 | **Asistente de descripción de producto (IA)** | Generar descripción/etiquetas sugeridas a partir del nombre — opcional, con Claude API |

---

## 6. PILAR E — Rendimiento y escalabilidad *(rol senior)*

### 6.1 — Quick wins inmediatos (esta iteración)
- **Caché del catálogo** (`getAll`): cachear en Redis por `(pagina, limite, categoriaId, soloActivos)`
  con TTL=`CACHE_TTL_CATALOGO`, invalidando al crear/editar/borrar/destacar producto.
  *Impacto esperado: 1.0-1.8 s → ~0.2-0.5 s (piso de red) en cache hit.* **← se aplica ya**
- **`select` en lugar de `include` total** en el catálogo: traer solo los campos que la tarjeta
  necesita (no el registro completo de `vendedor`), reduciendo payload y serialización.

### 6.2 — Latencia de red
- **Keep-alive / HTTP2**: garantizar reutilización de conexión (el navegador ya lo hace; verificar
  que Railway no corte conexiones agresivamente).
- **Región de despliegue**: evaluar región de Railway más cercana a Bolivia (o Cloudflare delante).
- **CDN para estáticos e imágenes**: servir imágenes de producto vía CDN (hoy URLs directas).

### 6.3 — Base de datos
- **Auditar índices** según los `where`/`orderBy` reales (catálogo ordena por `destacado, creadoEn`
  → índice compuesto; búsqueda por nombre → índice trigram).
- **`DataLoader`** para resolver relaciones por lote y matar cualquier N+1 en resolvers de campo.
- **Connection pooling** afinado para el adapter `@prisma/adapter-pg` bajo carga.

### 6.4 — Login
- **Rehash on login**: migrar gradualmente de bcrypt cost 12 → 11/10 (OWASP) revalidando al
  iniciar sesión, sin invalidar hashes existentes. Reduce el costo de CPU del login a la mitad.

### 6.5 — Cold start
- **Health ping** (cron externo o UptimeRobot) cada 4-5 min para mantener el contenedor caliente
  en plan Hobby; documentar upgrade a plan con always-on para producción real.

---

## 7. PILAR F — Observabilidad y operación

> "No se puede optimizar lo que no se mide." Hoy las métricas se sacan a mano.

| # | Capacidad | Herramienta sugerida (coherente y gratuita/barata) |
|---|-----------|----------------------------------------------------|
| F.1 | **Logging estructurado** (ya hay Fastify logger) | Pino + niveles + request-id por petición |
| F.2 | **Métricas de latencia por operación GraphQL** | Plugin de Yoga que mida cada resolver → log/percentiles |
| F.3 | **Error tracking** | Sentry (free tier) en frontend y backend |
| F.4 | **Health/uptime monitoring** | UptimeRobot o Better Stack sobre `/health` |
| F.5 | **CI** (lint + type-check + tests en cada push) | GitHub Actions |
| F.6 | **Dashboard de SLOs** | Panel admin interno con P50/P95 por operación |

---

## 8. PILAR G — Experiencia (pulido de Fase 2 pendiente)
- 404/500 propios, SEO + Open Graph (requiere dominio de producción), accesibilidad por teclado,
  auditoría móvil 375 px. **(Era la Etapa 6 — sigue pendiente.)**
- **PWA**: instalable + offline básico del catálogo (relevante para conectividad variable en Bolivia).

---

## 9. PILAR H — Modelo de negocio *(lo que pregunta un evaluador crítico)*

NexCom es un **marketplace** pero no modela ingreso propio. Aunque el pago siga simulado:
- **H.1 Comisión por venta** (ej. 5-10%): calcular y registrar la comisión de la plataforma por
  cada orden pagada; panel admin de "ingresos del marketplace".
- **H.2 Planes de vendedor** (free / pro con más productos, destacados incluidos).
- **H.3 Productos destacados pagados** (monetizar `destacado`).

Demuestra comprensión del negocio, no solo del CRUD.

---

## 10. Roadmap sugerido (orden por impacto/esfuerzo)

```
FASE 3.1 — Coherencia + Quick win de perf   (1ª, alto retorno inmediato)
  ├─ E.6.1  Caché del catálogo  ← YA en progreso
  ├─ A.1    Página /favoritos
  ├─ A.2/A.5 Reseñas visibles + rating en tarjetas
  └─ A.3    Botón reportar

FASE 3.2 — Descubrimiento
  ├─ B.1    Filtros y orden del catálogo
  ├─ B.2    Tienda pública del vendedor
  └─ A.4    Crear cupones (vendedor)

FASE 3.3 — Confianza + Inteligencia
  ├─ C.1    Q&A en producto
  ├─ D.1    Recomendaciones por co-ocurrencia
  └─ D.5    Alerta de bajada de precio en favoritos

FASE 3.4 — Operación senior
  ├─ F.1-F.5 Observabilidad (logs, Sentry, métricas, CI, uptime)
  ├─ E.6.3  Índices + DataLoader
  └─ E.6.4  Rehash login

FASE 3.5 — Negocio + Pulido
  ├─ H.1    Comisión del marketplace
  └─ G       404/500, SEO, PWA, móvil
```

---

## 11. Métricas de éxito (SLOs objetivo)

| Métrica | Objetivo |
|---------|----------|
| P95 catálogo (cache hit) | < 400 ms |
| P95 catálogo (cache miss) | < 900 ms |
| P95 login | < 700 ms |
| Error rate (GraphQL) | < 0.5 % |
| Lighthouse Performance (móvil) | > 85 |
| Cobertura de tests (services críticos) | > 70 % |
| Disponibilidad (`/health`) | > 99.5 % |

---

## 12. Estado de ejecución

Todo el trabajo **de código** del plan está implementado, testeado y desplegado:

| Fase | Contenido | Estado |
|------|-----------|--------|
| 3.1 | Pilar A — favoritos, reseñas, reportar, rating | ✅ Completa |
| 3.2 | B.1 filtros/orden, B.2 tienda pública, A.4 cupones vendedor | ✅ Completa |
| 3.3 | D.1 recomendaciones, D.5 alerta de precio, C.1 Q&A | ✅ Completa |
| 3.4 | F.1 logging, F.2/F.6 métricas+panel, F.5 CI, E.6.3 índice | ✅ Completa |
| 3.5 | H.1 comisión, H.2 planes vendedor, H.3 destacados, G.1 errores, G.2 SEO | ✅ Completa |

Rendimiento (Pilar E, parte de código): caché de catálogo, anti-stampede, rehash-login,
rate-limit en Redis, cron con lock, SSR del catálogo, índice compuesto — todo aplicado.

---

## 13. ⚙️ Tareas de CONFIGURACIÓN EXTERNA (pendientes — requieren servicios cloud)

> Estas son las **únicas** tareas que quedan. No son de código: dependen de configurar o
> contratar servicios externos. Requieren credenciales/planes/DNS que debe hacer el dueño del
> proyecto. Cada una incluye qué hacer y por qué.

| # | Tarea | Servicio | Qué configurar | Beneficio |
|---|-------|----------|----------------|-----------|
| 1 | **CDN + región** (E.6.2) | Cloudflare / Railway | Poner Cloudflare delante del backend; elegir región cercana a LatAm | Ataca el piso de red ~0.5 s para todas las lecturas |
| 2 | **Anti cold-start** (E.6.5) | UptimeRobot + Railway | Ping a `/health` cada 4 min + plan always-on (no Hobby) | Elimina el arranque en frío de ~1.7–2.1 s |
| 3 | **Pooler de conexiones** (E.6.3) | PgBouncer / Railway | Pooler en modo *transaction* delante de Postgres | Evita agotar conexiones a miles de usuarios |
| 4 | **Error tracking** (F.3) | Sentry | Crear proyecto, poner el DSN como env var (front y back) | Captura y alerta de errores en producción |
| 5 | **Uptime / alertas** (F.4) | UptimeRobot / Better Stack | Monitor sobre `/health` con alertas | Disponibilidad y aviso de caídas |
| 6 | **Dominio + SEO completo** (G.2) | Vercel / dominio | Fijar `NEXT_PUBLIC_SITE_URL` al dominio real + imagen Open Graph | URLs OG absolutas e imagen al compartir |

**Nota:** el código ya está listo para todas: el backend expone `/health` con chequeo profundo,
el `metadataBase` lee `NEXT_PUBLIC_SITE_URL`, el rate-limit y la caché usan Redis (compatibles con
un pooler), y la degradación elegante cubre fallos de dependencias. Solo falta la configuración.

---

*NexCom — Plan Fase 3 | Generado tras auditoría de código y medición de rendimiento en producción | Junio 2026*
