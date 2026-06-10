# PLAN DE MEJORAS — FASE 2 (Post Sprint 5)
> NexCom Marketplace | Continuación profesional tras deploy en producción
> Базеline: Sprints 1-5 completos estructuralmente (17/17 módulos backend, todas las páginas frontend, 0 errores TS)

---

## DIAGNÓSTICO DE PARTIDA

El proyecto **no está incompleto en alcance** — todos los módulos del `PLAN_DESARROLLO.md`
existen y compilan. La sensación de "a medias" viene de tres fuentes concretas,
verificadas por lectura directa de código:

| # | Hallazgo | Evidencia |
|---|----------|-----------|
| 1 | **Centro de notificaciones nunca se construyó en frontend** (tarea 4.8 del plan). El backend `notificaciones` está 100% completo y `frontend/src/graphql/notificaciones/` tiene las queries/mutations listas, pero no existe ningún componente que las use. | No hay `NotificationBell`, ni badge de no-leídas en ningún navbar |
| 2 | **Componentes "genéricos del navegador"** en flujos clave: `<select>` nativo para categoría (crear/editar producto) y `<input type="datetime-local">` nativo para fechas de ofertas | `vendedor/productos/nuevo` y `[id]/editar` (líneas ~127-157), `vendedor/ofertas/nueva` (líneas 159-177) |
| 3 | **Componentes planificados pero nunca extraídos** — `components/ordenes/` y `components/checkout/` (TimelineEstados, OrdenCard, CambiarEstadoModal, ResumenCarrito, etc.) no existen como módulos reutilizables; la lógica está inline en las páginas, lo que limita la consistencia visual | Solo existen `components/ui`, `components/busqueda`, `components/productos`, `components/cart` |
| 4 | **QA del Sprint 5 (5.5/5.6/5.7)** — sin tests Vitest, sin script k6, checklist de seguridad sin verificar | No existe `*.test.ts` ni `k6/` |
| 5 | **Admin → Reportes** usa filtros y listas básicas, sin visualización de tendencias (el ícono `BarChart2` solo aparece en el empty state, no hay gráfico real) | `admin/reportes/page.tsx` |

Esto reencuadra el trabajo: **no se trata de "completar módulos"**, sino de subir el
nivel de pulido, profundidad de UX y consistencia — exactamente lo que pediste.

---

## CRITERIO DE DISEÑO TRANSVERSAL

Cada componente nuevo debe:
- Sentirse "hecho a medida" para NexCom (paleta indigo/violet/slate ya establecida, ver memoria de diseño)
- Tener animaciones ≤ 350ms (regla ya aplicada en `/ux-pro`)
- Ser accesible por teclado (Tab, Esc, flechas) — los `<select>`/`<input type="datetime-local">` nativos sí lo son de fábrica; los reemplazos custom DEBEN igualar eso, no perderlo
- No usar librerías pesadas: preferir construir sobre **Radix UI primitives** (headless, accesible, ligero) en vez de reinventar focus-trap/aria a mano

**Comparación de referencia por feature** (se detalla en cada etapa):
Mercado Libre (catálogo/checkout LatAm), Shopify Admin (panel vendedor), Linear/Notion (notificaciones y combos), Booking.com (selector de fechas).

---

## ETAPA 1 — Reemplazar elementos nativos del navegador (Quick wins, alta visibilidad)
**Duración estimada:** 3-4 días | **Prioridad: ALTA** (pedido explícito del usuario)

### 1.1 — Combobox de Categoría (reemplaza `<select>`)
**Dónde:** `vendedor/productos/nuevo/page.tsx`, `vendedor/productos/[id]/editar/page.tsx`

- Crear `frontend/src/components/ui/Select.tsx` sobre `@radix-ui/react-select`
  (instalar `@radix-ui/react-select` — única dependencia nueva, ~15kb, headless)
- Diseño: trigger con el mismo estilo que los inputs (`bg-slate-50 border-slate-200 rounded-xl pl-10`),
  ícono de categoría a la izquierda, chevron animado a la derecha, dropdown con
  `rounded-xl shadow-lg` y opción activa resaltada en `indigo-50`
- Soporta categorías jerárquicas (padre/hijo) con indentación visual — actualmente
  el `<select>` nativo probablemente las muestra planas
- **Por qué importa:** un `<select>` nativo en Windows/Mac/Android se ve completamente
  distinto y rompe la identidad visual; Mercado Libre y Shopify Admin usan combos
  custom para esto precisamente por consistencia cross-browser

### 1.2 — Selector de fecha/hora para Ofertas (reemplaza `datetime-local`)
**Dónde:** `vendedor/ofertas/nueva/page.tsx`

- Crear `frontend/src/components/ui/DateTimePicker.tsx` sobre `react-day-picker`
  (ligera, ya muy usada con Tailwind) + selector de hora custom (dos `Select` de hora/minuto del 1.1)
- Popover con calendario mensual, rango mínimo = hoy para `fechaInicio`,
  mínimo = `fechaInicio` para `fechaFin` (ya existe esta regla, solo cambia el input)
- Mostrar la fecha seleccionada en formato boliviano: "vie 12 jun, 14:30"
- **Por qué importa:** el picker nativo de Chrome es distinto al de Firefox/Safari y
  no se puede estilizar — Booking/Airbnb resuelven esto con calendarios propios

### 1.3 — ConfirmDialog para acciones destructivas
**Dónde:** auditar y aplicar en:
- `vendedor/productos/page.tsx` (desactivar/eliminar producto)
- `vendedor/ofertas/page.tsx` (cancelar oferta)
- `comprador/ordenes/[id]/page.tsx` (cancelar orden)
- `admin/usuarios/page.tsx` (toggle activo, cambiar rol)
- `admin/reportes/[id]/page.tsx` (resolver/rechazar reporte)

- Crear `frontend/src/components/ui/ConfirmDialog.tsx` sobre `@radix-ui/react-alert-dialog`
- Variantes: `danger` (rojo, para cancelar/desactivar) y `default` (indigo, para confirmaciones neutras)
- Props: `title`, `description`, `confirmLabel`, `onConfirm` (async, muestra spinner mientras corre)
- **Por qué importa:** ya no hay `window.confirm` (verificado, 0 ocurrencias) — esto es
  preventivo para que ninguna acción destructiva futura caiga en el diálogo nativo del navegador,
  y para las que hoy ejecutan directo sin ninguna confirmación

### 1.4 — Auditoría de inputs numéricos y de cantidad
**Dónde:** `CartDrawer.tsx`, `comprador/ordenes/[id]` (cantidad en carrito)

- Reemplazar `<input type="number">` con stepper custom (`-` / cantidad / `+`) ya
  parcialmente presente en algunos lados — unificar en `components/ui/QuantityStepper.tsx`
- Evita las flechitas nativas inconsistentes del `type="number"`

---

## ETAPA 2 — Centro de Notificaciones (cierra el gap real del Sprint 4)
**Duración estimada:** 2-3 días | **Prioridad: ALTA**

El backend ya soporta todo esto (`notificaciones.resolver.ts`, queries `misNotificaciones`,
mutations `marcarLeida`/`marcarTodasLeidas`). Solo falta el frontend.

### 2.1 — `NotificationBell.tsx`
`frontend/src/components/notificaciones/NotificationBell.tsx`
- Ícono `Bell` con badge rojo de contador (estilo LinkedIn/GitHub: punto si >0, número si ≤9, "9+" si más)
- `useQuery(MIS_NOTIFICACIONES, { pollInterval: 30000 })` — exactamente como especifica 4.8 del plan
- Dropdown (Radix Popover) con lista de notificaciones recientes (máx 8), cada una con:
  ícono según `tipo` (pago, orden, valoración, sistema), título, tiempo relativo ("hace 5 min"),
  punto indigo si no leída
- Click en notificación → `marcarLeida` + `router.push(notif.url)`
- Botón "Marcar todas como leídas"
- Footer "Ver todas" (si se decide crear página `/notificaciones` — opcional, evaluar con el usuario)

### 2.2 — Integración en navbars
- `(main)/layout.tsx` (comprador navegando público)
- `vendedor/layout.tsx`
- `comprador/layout.tsx`
- `admin/layout.tsx`

Cada uno usa el mismo componente, solo cambia la posición/color de acento según el rol
(violet para vendedor, slate para admin, indigo para comprador — consistente con el design system ya aplicado).

### 2.3 — Util de tiempo relativo
`frontend/src/lib/format-relative-time.ts` — "hace 2 min", "hace 3h", "ayer", fallback a fecha
(sin librería externa, ~20 líneas)

---

## ETAPA 3 — Profundizar flujos críticos (comparación con apps reales)
**Duración estimada:** 5-7 días | **Prioridad: MEDIA-ALTA**

### 3.1 — Checkout: stepper de progreso
**Dónde:** `checkout/page.tsx`, `checkout/pago/page.tsx`, `checkout/confirmacion/page.tsx`

- Crear `components/checkout/CheckoutStepper.tsx`: barra horizontal con 3 pasos
  ("Carrito", "Pago", "Confirmación"), paso actual resaltado en indigo, pasos completados
  con check verde — **patrón estándar de Amazon/Shopify/MercadoLibre checkout**
- Reduce la ansiedad del usuario sobre "cuántos pasos faltan" (principio UX: visibilidad del estado del sistema)

### 3.2 — Timeline visual de estados de orden
**Dónde:** `comprador/ordenes/[id]/page.tsx`, `vendedor/ordenes/[id]/page.tsx`

- Crear `components/ordenes/TimelineEstados.tsx` (estaba planificado en 4.7, nunca se hizo
  como componente reutilizable)
- Timeline vertical con punto + línea conectora, estado actual resaltado, fecha/hora
  de cada `HistorialEstadoOrden`, ícono según estado (Package, Truck, CheckCircle, XCircle)
- **Comparación:** este es el patrón de tracking de Amazon/Mercado Libre/Aliexpress —
  reduce drásticamente los tickets de soporte ("¿dónde está mi pedido?")

### 3.3 — Modal de cambio de estado para vendedor
**Dónde:** `vendedor/ordenes/[id]/page.tsx`

- Crear `components/ordenes/CambiarEstadoModal.tsx` (planificado en 4.7)
- Usa el `ConfirmDialog` de la Etapa 1 como base, pero con un `Select` (Etapa 1.1)
  para elegir el siguiente estado válido **según la máquina de estados** (el backend
  ya valida esto — el frontend debe filtrar las opciones mostradas para que el
  vendedor solo vea transiciones permitidas, evitando errores antes de enviarlos)
- Campo opcional de nota + (para "ENVIADO") campo de URL de comprobante

### 3.4 — Dashboard Vendedor: gráfico de ventas
**Dónde:** `vendedor/page.tsx`

- Instalar `recharts` (ligera, declarativa, ya muy estándar en dashboards React)
- Gráfico de área/barras: ventas de los últimos 7/30 días (el backend de `admin`
  ya tiene `ordenesUltimos7Dias[]` en `estadisticasGenerales` — replicar query
  equivalente con scope `misOrdenes` para vendedor, o exponerla si no existe)
- **Comparación:** todo dashboard de vendedor profesional (Shopify, Mercado Shops,
  Etsy Seller Hub) muestra tendencia de ventas como primer elemento visual, no solo números

### 3.5 — Búsqueda: filtros persistentes + "sin resultados" inteligente
**Dónde:** `(main)/buscar/page.tsx`

- Si una búsqueda no tiene resultados, sugerir: quitar el filtro de precio más
  restrictivo, o mostrar productos de la misma categoría sin el término de búsqueda
  ("Mostrando productos similares en 'Electrónica'")
- **Comparación:** Amazon nunca muestra una página 100% vacía — siempre ofrece alternativas

---

## ETAPA 4 — Admin: de listas a panel de control real
**Duración estimada:** 3-4 días | **Prioridad: MEDIA**

### 4.1 — Gráficos en `admin/page.tsx` y `admin/reportes/page.tsx`
- Reemplazar el ícono estático `BarChart2` por un gráfico real (`recharts`) usando
  `estadisticasGenerales.ordenesUltimos7Dias` (el backend ya lo expone según el plan 5.3)
- Tarjeta de "Reportes pendientes" con conteo destacado en `admin/page.tsx` (actualmente
  el dashboard admin no muestra nada de moderación — solo usuarios/productos)

### 4.2 — Filtros de `admin/reportes` y `admin/usuarios` como pills/Select custom
- Reemplazar los `EstadoFilter`/`TipoFilter` (probablemente `<select>` o botones planos)
  por el `Select` de la Etapa 1.1 o por pills tipo "chip" seleccionable —
  **patrón de filtros de Linear/Notion**: feedback inmediato, sin recargar página

### 4.3 — `admin/configuracion`: validación contextual por tipo
- El módulo `config-sistema` tiene `tipo: NUMBER | BOOLEAN | STRING`. Verificar que
  el formulario renderiza el control correcto por tipo (toggle para BOOLEAN en vez
  de texto "true"/"false", input numérico con min/max para NUMBER)

---

## ETAPA 5 — QA y Seguridad (cierra Sprint 5 oficialmente)
**Duración estimada:** 4-5 días | **Prioridad: MEDIA** (no bloquea UX pero estaba en criterios de aceptación)

### 5.1 — Tests unitarios Vitest (4 services críticos del plan original)
- `auth.service.test.ts`, `pagos.service.test.ts`, `valoraciones.service.test.ts`, `ordenes.service.test.ts`
- Cobertura objetivo 60% — usar mocks de Prisma con `vitest-mock-extended`

### 5.2 — Script de carga k6
- `k6/load-test.js` con la distribución 40/30/20/10 especificada en el plan original

### 5.3 — Checklist de seguridad (revisión, no implementación nueva)
- Recorrer los 10 puntos del checklist 5.7 del `PLAN_DESARROLLO.md` y documentar
  en `SECURITY_CHECKLIST.md` cuáles están cubiertos y cuáles requieren ajuste
  (ej: rate limiting en mutaciones de auth — verificar si `@fastify/rate-limit` está instalado)

---

## ETAPA 6 — Pulido de producción
**Duración estimada:** 3-4 días | **Prioridad: BAJA-MEDIA** (calidad percibida pero no funcional)

### 6.1 — Páginas de error custom
- `frontend/src/app/not-found.tsx` (404) y `error.tsx` (500) con el mismo lenguaje
  visual de NexCom (actualmente Next.js sirve sus páginas default)

### 6.2 — SEO en páginas de producto
- `generateMetadata()` en `(main)/productos/[id]/page.tsx` — título/descripción
  dinámicos por producto, Open Graph image (mejora compartibilidad en WhatsApp,
  canal de venta clave para microempresas bolivianas)

### 6.3 — Accesibilidad de los nuevos componentes (Etapas 1-4)
- Verificar navegación por teclado y `aria-*` en `Select`, `DateTimePicker`,
  `ConfirmDialog`, `NotificationBell` (Radix los provee, pero validar con teclado real)

### 6.4 — Auditoría móvil
- Probar en viewport 375px: `CheckoutStepper`, `TimelineEstados`, dropdowns de
  `NotificationBell` y `Select` (los Popover de Radix necesitan `collisionPadding`
  para no desbordar en pantallas chicas)

---

## ORDEN RECOMENDADO DE EJECUCIÓN

```
1. ETAPA 1 (nativos → custom)     ← pedido explícito, alto impacto visual inmediato
2. ETAPA 2 (notificaciones)        ← gap funcional real, backend ya listo
3. ETAPA 3 (flujos críticos)       ← mayor impacto en percepción "profesional"
4. ETAPA 4 (admin)                 ← menor visibilidad para usuarios finales
5. ETAPA 6 (pulido)                ← rápido de intercalar entre etapas
6. ETAPA 5 (QA/seguridad)          ← no bloquea demo/uso, pero cierra el plan formalmente
```

## DEPENDENCIAS NUEVAS A INSTALAR
```bash
cd frontend
npm install @radix-ui/react-select @radix-ui/react-alert-dialog @radix-ui/react-popover react-day-picker recharts
```
Todas son ligeras, headless donde aplica, y compatibles con React 19 (verificar peer deps —
si hay conflicto, ya existe `legacy-peer-deps=true` en `.npmrc`).

---

*NexCom — Plan de Mejoras Fase 2 | Generado tras verificación de Sprints 1-5 (100% completos) | Junio 2026*
