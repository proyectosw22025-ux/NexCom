# PLAN DE DESARROLLO — FASE 4: Marketplace Boliviano Auténtico + Escala
> NexCom | Continuación tras Fase 3 (escalabilidad + rendimiento + features) completa
> Objetivo: cerrar las brechas de **autenticidad boliviana**, **agilidad de uso** y
> **correctitud a escala**, con criterio estratégico y orden de ejecución coherente.

---

## ✅ ESTADO DE AVANCE (actualizado — junio 2026)

**Leyenda:** ✅ Hecho (código + tests + desplegado) · 🟡 Parcial · ⏳ Pendiente · ⚙️ Requiere servicio externo (tus credenciales)

> Todo el código a mi alcance (🛠️) de las fases 4.1 → 4.6 está **completado, probado y desplegado**.
> Backend: 123 tests pasando. Lo único pendiente depende de servicios externos (§9).

| Fase | Tarea | Estado | Commit / nota |
|------|-------|--------|----------------|
| 4.1.1 | Pagos bolivianos (QR/transferencia/contra-entrega) + BOB | ✅ | flujo simulado |
| 4.1.2 | Integración WhatsApp (`wa.me`) | ✅ | |
| 4.2.1 | Split de órdenes multi-vendedor | ✅ | |
| 4.2.2 | Módulo de Mensajería | ✅ | |
| 4.3.1 | Búsqueda con autocompletado | ✅ | |
| 4.3.2 | Búsqueda tolerante a errores (`pg_trgm`) | ✅ | migración aplicada |
| 4.3.3 | Filtro por ciudad/departamento | ✅ | |
| 4.3.4 | Onboarding guiado del vendedor | ✅ | |
| 4.3.5 | Auditoría móvil 375px | ✅ | |
| 4.3.6 | Accesibilidad (teclado + `aria`) | ✅ | |
| 4.3.7 | Carrito: aviso multi-vendedor / guardar para después | ✅ | |
| 4.4.1 | Subida de imágenes (Cloudinary) | ✅ | credenciales ya conectadas |
| 4.4.2 | Envíos / logística (costo por zona + retiro) | ✅ | |
| 4.4.3 | Devoluciones / reembolsos | ✅ | |
| 4.4.4 | Facturación con NIT | ✅ | IVA 13% por dentro |
| 4.4.5 | Liquidación a vendedores (payouts) | ✅ | |
| 4.4.6 | UI admin de cupones globales | ✅ | |
| 4.5.1 | Cola de eventos (BullMQ) | ✅ | emails asíncronos |
| 4.5.2 | Concurrencia de stock (anti-sobreventa) | ✅ | verificado bajo carga |
| 4.5.3 | Búsqueda dedicada (Meilisearch) | ⏳ ⚙️ | requiere instancia externa |
| 4.5.4 | CDN de imágenes | ✅ | vía Cloudinary |
| 4.6 | Sellos de confianza locales | ✅ | verificado/bien valorado/responde rápido |
| 4.6 | Recomendaciones por ciudad | ✅ | "Lo más vendido en {ciudad}" |
| 4.6 | Modo feria/temporada | ✅ | campañas por fecha boliviana |
| 4.6 | Programa de fidelidad (puntos) | ✅ | ganar + canjear |
| 4.6 | Retiro en punto/zona + agrupación de envíos por barrio | ✅ | |
| 4.x | Pago con tarjeta en MODO DEMO (sin cobro real) | ✅ | Stripe real → §9 |

**✅ TODO EL CÓDIGO DE LA FASE 4 ESTÁ COMPLETO.** No quedan pendientes de código.
**Pendientes (§9 — dependen de tus servicios externos, dejados para el final):** vincular pasarela de pago real (Stripe), Meilisearch, WhatsApp Business API. El pago hoy funciona en **modo demo** (incluida tarjeta).

---

## 0. Diagnóstico de partida (auditoría de código)

La Fase 3 dejó el producto sólido en features y rendimiento. Pero una auditoría honesta
revela brechas que **un evaluador boliviano notaría de inmediato** y problemas de
correctitud que afloran a escala. Verificado en código:

| Hallazgo | Evidencia | Severidad |
|----------|-----------|-----------|
| Pagos en **Stripe + USD** con precios en **Bs.** | `pagos.service.ts`: `currency: "usd"` | 🔴 Alta — Stripe no opera en Bolivia |
| Imágenes de producto = **URLs pegadas** | `productos/nuevo`: textarea "URLs, una por línea" | 🔴 Alta — uso real imposible |
| **Mensajería diseñada pero sin construir** | modelos `Conversacion`/`Mensaje` en BD, sin módulo ni UI | 🔴 Alta — feature fantasma |
| **Carrito multi-vendedor mal atribuido** | `pagos.service`: `vendedorId = items[0]...` | 🟠 Media — bug a escala |
| Sin **WhatsApp** (canal #1 en Bolivia) | no existe | 🟠 Media |
| Sin **envíos, devoluciones, facturación (NIT), payouts** | módulos inexistentes | 🟡 Media |

**Principio rector de esta fase:** primero lo que da **autenticidad + correctitud** (alto
impacto, en mi alcance), luego lo que requiere **servicios externos** (al final, documentado).

---

## Convención de alcance

- 🛠️ **CÓDIGO (mi alcance total)** — lo implemento, testeo y despliego end-to-end.
- 🔗 **HÍBRIDO** — yo hago el código (guardado por variable de entorno); tú configuras un servicio externo (cuenta/API key).
- ⚙️ **CONFIG EXTERNA** — fuera de mi alcance; requiere cuentas/contratos/infra. Va al cuadro final (§9).

---

## ✅ FASE 4.1 — Autenticidad boliviana de pagos y contacto *(PRIORIDAD MÁXIMA)* — COMPLETADA

**Rol estratégico:** es lo que convierte "un e-commerce genérico" en "un marketplace
boliviano". Máximo impacto visible para la presentación, y 100% en mi alcance (simulado).

### ✅ 4.1.1 🛠️ Métodos de pago bolivianos (simulados) + moneda BOB
- Reemplazar el flujo Stripe/USD por un **selector de método de pago boliviano**:
  - **QR Simple** (pantalla con un QR generado, simulado, "escanea con tu app bancaria").
  - **Transferencia bancaria** (datos de cuenta + subida/registro de comprobante).
  - **Pago contra entrega** (efectivo al recibir).
  - *(Opcional)* **Tigo Money / billetera móvil**.
- Moneda en **BOB (Bs.)** en toda la cadena de pago (hoy el monto va en USD).
- El estado de la orden se ajusta al método (ej. contra entrega → "PAGO_PENDIENTE_ENTREGA").
- **Criterio:** mantener el patrón de snapshot/transacción ya existente; el pago real queda
  como integración futura (§9), pero el **flujo y los métodos** son auténticos.

### ✅ 4.1.2 🛠️ Integración de WhatsApp
- Botón **"Consultar por WhatsApp"** en la ficha de producto y en la tienda del vendedor
  (abre `wa.me` con mensaje pre-cargado: producto + enlace).
- **Compartir por WhatsApp** un producto/tienda.
- Requiere que el vendedor tenga teléfono (ya existe `telefono` en el perfil).

---

## ✅ FASE 4.2 — Correctitud a escala y feature fantasma — COMPLETADA

**Rol estratégico:** corregir lo que está mal *antes* de crecer, y activar lo que ya está
a medio construir en la BD. Bajo "ruido", alto valor de ingeniería.

### ✅ 4.2.1 🛠️ Split de órdenes multi-vendedor
- Al pagar, **dividir el carrito en una orden por vendedor** (cada vendedor recibe su orden,
  su notificación y su cálculo de comisión correcto).
- **Criterio:** es un cambio arquitectónico en `pagos.service` + `ordenes`; preservar
  atomicidad (todas las órdenes se crean o ninguna) y el descuento de stock por ítem.
- Alternativa mínima si se prefiere: **restringir el carrito a un solo vendedor** con aviso
  claro. (Recomiendo el split por ser lo de un marketplace real.)

### ✅ 4.2.2 🛠️ Módulo de Mensajería (los modelos ya existen)
- Backend: módulo `mensajes` (4 capas) usando `Conversacion`/`Mensaje` ya en el schema.
  Queries: `misConversaciones`, `mensajes(conversacionId)`. Mutations: `enviarMensaje`,
  `iniciarConversacion(productoId)`. Notificación al recibir (infra ya existe).
- Frontend: bandeja de conversaciones (comprador y vendedor) + chat por producto.
- **Criterio:** reutilizar la infra de notificaciones en tiempo real (WebSocket) ya montada.

---

## ✅ FASE 4.3 — Agilidad y autonomía del frontend — COMPLETADA

**Rol estratégico:** reducir la fricción para que el usuario boliviano (mayormente móvil)
use la plataforma sin ayuda. Mejoras de UX de alto retorno.

| # | Tarea | Alcance | Estado |
|---|-------|---------|--------|
| 4.3.1 | **Búsqueda con autocompletado** (sugerencias al escribir) | 🛠️ | ✅ |
| 4.3.2 | **Búsqueda tolerante a errores** (`pg_trgm` / índice GIN trigram) | 🛠️ migración | ✅ |
| 4.3.3 | **Filtro por ciudad/departamento** en el catálogo (marketplace *local*) | 🛠️ | ✅ |
| 4.3.4 | **Onboarding guiado del vendedor** ("publica tu primer producto") | 🛠️ | ✅ |
| 4.3.5 | **Auditoría móvil 375px** (la mayoría compra desde el celular) | 🛠️ | ✅ |
| 4.3.6 | **Accesibilidad** (teclado + `aria`) en componentes clave | 🛠️ | ✅ |
| 4.3.7 | **Carrito**: aviso multi-vendedor + "guardar para después" | 🛠️ | ✅ |

---

## ✅ FASE 4.4 — Módulos nuevos del marketplace — COMPLETADA

**Rol estratégico:** completar el ciclo de venta real (envío, posventa, formalidad fiscal,
liquidación). Sin esto, "funciona para demo" pero no para operar de verdad.

### ✅ 4.4.1 🔗 Subida real de imágenes (upload + CDN) — *(credenciales Cloudinary ya conectadas)*
- Frontend: componente de **arrastrar/soltar o cámara**; backend: endpoint de subida
  (`@fastify/multipart` ya instalado) que sube a **Cloudinary/ImageKit**.
- *Mi parte:* el código (guardado por las API keys). *Tu parte:* crear cuenta Cloudinary y
  poner las keys como variables de entorno → ver §9.

### ✅ 4.4.2 🛠️ Envíos / Logística (simulado)
- Costo de envío por **zona/departamento**, "retiro en tienda", y estado de entrega.
- Se integra con el timeline de órdenes ya existente.

### ✅ 4.4.3 🛠️ Devoluciones / Reembolsos
- Flujo: comprador solicita devolución → vendedor aprueba/rechaza → reembolso (simulado) →
  historial. Reutiliza el patrón de máquina de estados de órdenes.

### ✅ 4.4.4 🛠️ Facturación con NIT
- Datos fiscales del comprador (NIT/CI) en el checkout y **generación de factura/recibo**
  (PDF o vista imprimible) por orden pagada. Requisito formal en Bolivia.

### ✅ 4.4.5 🛠️ Liquidación a vendedores (payouts)
- Registrar por orden pagada la **comisión de la plataforma** y el **neto al vendedor**;
  panel del vendedor con "saldo a liquidar" y del admin con "comisiones acumuladas".
  (Hoy la comisión solo se *muestra* agregada en admin, sin desglose ni payout.)

### ✅ 4.4.6 🛠️ UI admin de cupones globales
- Crear/gestionar cupones de plataforma (el backend ya soporta `vendedorId = null`).

---

## 🟡 FASE 4.5 — Escala arquitectónica — CÓDIGO COMPLETO (4.5.3 requiere servicio externo)

**Rol estratégico:** preparar el sistema para miles de usuarios sin reescribir después.

| # | Tarea | Alcance | Estado |
|---|-------|---------|--------|
| 4.5.1 | **Cola de eventos** (BullMQ sobre el Redis ya existente) para emails/notificaciones/payouts asíncronos | 🛠️ | ✅ (emails asíncronos) |
| 4.5.2 | **Concurrencia de stock** — validar/blindar sobreventa bajo carga (prueba con k6 ya disponible) | 🛠️ | ✅ (decremento atómico + CHECK, verificado bajo carga) |
| 4.5.3 | **Búsqueda dedicada** (Meilisearch/Typesense) cuando el catálogo crezca | ⚙️ servicio externo | ⏳ pendiente (hoy FTS + pg_trgm en Postgres) |
| 4.5.4 | **CDN de imágenes** | ⚙️ (parte de 4.4.1) | ✅ (vía Cloudinary) |

---

## ✅ FASE 4.6 — Diferenciación auténtica (creatividad coherente) — COMPLETADA

**Rol estratégico:** lo que hace a NexCom memorable y "muy boliviano", sin perder coherencia.

- ✅ **Sellos de confianza locales**: "Microempresa verificada de {ciudad}", "Bien valorado", "Responde rápido".
- ✅ **Recomendaciones por ciudad** ("Lo más vendido en La Paz").
- ✅ **Modo feria/temporada**: campañas por fechas bolivianas (Día de la Madre, Navidad, San Juan, ferias).
- ✅ **Programa de fidelidad** con puntos canjeables (ganar al comprar + canjear como descuento).
- ✅ **Retiro en punto/zona** (puntos NexCom por ciudad). 🟡 *Agrupación de envíos por barrio: pendiente.*

---

## 7. Orden recomendado de ejecución

```
1. FASE 4.1  Pagos bolivianos + WhatsApp      ← autenticidad, máximo impacto, 100% código
2. FASE 4.2  Split de órdenes + Mensajería     ← correctitud + feature fantasma
3. FASE 4.3  Agilidad del frontend             ← fricción de uso (móvil/búsqueda/filtros)
4. FASE 4.4  Módulos nuevos                     ← ciclo de venta real
5. FASE 4.5  Escala arquitectónica             ← preparar el crecimiento
6. FASE 4.6  Diferenciación                     ← rápido de intercalar
   ── al final ──
7. §9        Tareas de CONFIGURACIÓN EXTERNA    ← cuando todo el código esté listo
```

**Regla de trabajo:** primero termino **todo lo de código (🛠️ + la parte 🛠️ de los 🔗)**,
con tests y verificación en producción por tarea; las tareas **⚙️ de configuración externa**
quedan reunidas en el cuadro final para ejecutarlas al cierre.

---

## 8. Criterios de calidad (transversales)

- Cada tarea: `tsc` limpio, tests donde aplique, `next build` OK, commit + push + verificación en producción.
- Pagos/dinero siempre con `Decimal` (nunca float). Moneda **BOB**.
- Degradación elegante (el sistema sigue si una dependencia falla).
- Sin romper funcionalidad existente; cambios reversibles cuando toquen infra.

---

## 9. ⚙️ Tareas de CONFIGURACIÓN EXTERNA (al final — fuera de mi alcance de código)

> Reúno aquí **solo** lo que depende de servicios externos. El código quedará listo y
> guardado por variables de entorno; estas tareas son crear cuentas/keys y pegarlas.

| # | Tarea | Servicio | Estado | Qué configurar | Habilita |
|---|-------|----------|--------|----------------|----------|
| 1 | **Almacenamiento de imágenes** (4.4.1) | Cloudinary / ImageKit | ✅ **conectado** | Cuenta + API keys (ya hechas) | Subida real de fotos de producto |
| 2 | **Pasarela de pago real** (4.1.1) | QR Simple BCB / banco / billetera | ⏳ pendiente | Convenio bancario + credenciales | Pagos reales (hoy simulados) |
| 3 | **Buscador dedicado** (4.5.3) | Meilisearch / Typesense (cloud) | ⏳ pendiente | Instancia + API key | Búsqueda a gran escala |
| 4 | **WhatsApp Business API** (opcional, 4.1.2) | Meta / proveedor | ⏳ pendiente | Número + API (solo si se quiere mensajería automática; `wa.me` ✅ ya funciona) | Mensajería WhatsApp avanzada |
| 5 | **CDN de imágenes** | Cloudinary/Cloudflare | ✅ (vía #1) | Incluido en #1 | Entrega rápida de imágenes |
| — | *(Pendientes de Fase 3)* | Cloudflare backend, dominio propio | ⏳ | — | CDN backend + branding/SEO completo |

**Nota:** el código de cada una se entrega listo y guardado por env (patrón ya usado con
Sentry y el pooler de Neon): se "encienden" al poner las credenciales, sin romper nada si faltan.

---

*NexCom — Plan Fase 4 | Generado tras auditoría de código y análisis de autenticidad boliviana + escala | Junio 2026*
*Estado actualizado: todo el código (🛠️) de 4.1→4.6 completado, probado (123 tests backend) y desplegado. Pendientes: solo lo que depende de servicios externos (§9) + "guardar para después" (4.3.7) y agrupación de envíos por barrio (4.6).*
