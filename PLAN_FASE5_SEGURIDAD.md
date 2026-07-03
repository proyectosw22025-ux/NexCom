# PLAN_FASE5 — Seguridad y Confianza: Escrow + Confirmación de Entrega

> Estado global: **PENDIENTE** (diseño aprobado, sin implementar).
> Money siempre `Decimal` (BOB). Ledger de saldos **append-only** (sin saldo mutable).
> Compatible con el pago **DEMO** actual: el escrow es contabilidad interna; cuando se
> integre Stripe real (diferido), la liberación/reembolso se enchufan a la pasarela.

---

## 1. Contexto y problema

NexCom es un marketplace boliviano con logística **entre ciudades**. Riesgo central de
confianza:

> El comprador paga → el producto puede no llegar físicamente → pero el vendedor ya
> cobró. El comprador queda desprotegido y el marketplace pierde credibilidad.

**Estado actual del código (auditado):**
- Al confirmarse el pago, `pagos.service._confirmarOrden` llama a
  `saldos.service.registrarVenta`, que crea un movimiento **`VENTA`** y acredita el neto
  como **saldo disponible del vendedor de inmediato**. → **No existe retención.**
- Estados de orden: `PENDIENTE_PAGO → PAGADO → EN_PREPARACION → ENVIADO → ENTREGADO →
  COMPLETADO` (+ `CANCELADO`).
- El comprador ya tiene `ordenes.service.marcarEntregada` (ENVIADO→ENTREGADO), pero es un
  simple botón: **no pide prueba de recepción ni gobierna el dinero.**
- Ledger append-only (`MovimientoSaldo`, tipos `VENTA` / `REEMBOLSO`), idempotente por
  `(ordenId, tipo)`. `historial_estados_orden` ya audita cambios de estado.

**Objetivo de la Fase 5:** retener los fondos en garantía ("Compra Protegida NexCom") y
liberarlos al vendedor **solo** tras una confirmación de entrega **verificable** mediante
**código de entrega + QR**, con ventana de disputa y auto-liberación de respaldo.

---

## 2. ÉPICA 1 — Escrow (retención) + Código de entrega  *(núcleo)* — ✅ HECHO

> Backend (commit escrow core) + UI (comprador/vendedor/saldo) implementados y
> verificados end-to-end contra BD. Migración aplicada (Railway auto-aplica en deploy).

### 2.1 Modelo de datos (Prisma + migración)

**Ledger de saldos — nueva semántica (reemplaza el `VENTA` inmediato):**
- `RETENCION`  → crédito al bucket **retenido** (al confirmarse el pago).
- `LIBERACION` → mueve **retenido → disponible** (al confirmar entrega).
- `REEMBOLSO`  → revierte (disputa a favor del comprador). *(ya existe)*
- Saldos derivados (siguen siendo suma de movimientos, sin columna mutable):
  - `saldoRetenido  = Σ RETENCION − Σ LIBERACION − Σ REEMBOLSO(de retenido)`
  - `saldoDisponible = Σ LIBERACION − retiros(pendiente|pagado)`

> Decisión: ampliar `enum TipoMovimientoSaldo` con `RETENCION` y `LIBERACION`. Migrar el
> flujo de `registrarVenta` para emitir `RETENCION` en vez de `VENTA`. (El `VENTA` histórico
> se puede mantener como alias de compatibilidad o migrar datos de demo.)

**`Orden` — campos nuevos:**
| Campo | Tipo | Uso |
|---|---|---|
| `codigoEntregaHash` | `String?` | hash del PIN (nunca en claro) |
| `codigoEntregaExp`  | `DateTime?` | expiración / validez |
| `intentosCodigo`    | `Int @default(0)` | anti–fuerza bruta |
| `codigoBloqueadoHasta` | `DateTime?` | lockout temporal |
| `fondosLiberadosEn` | `DateTime?` | marca de liberación (idempotencia) |
| `autoLiberaEn`      | `DateTime?` | fecha límite de auto-liberación |
| `disputaAbierta`    | `Boolean @default(false)` | congela auto-liberación |

**Tabla nueva `EventoSeguridad` (audit log inmutable):** `id, tipo, usuarioId?, ordenId?, ip?,
metadata Json, creadoEn`. Tipos: `LIBERACION`, `INTENTO_CODIGO_FALLIDO`, `RETIRO`,
`DISPUTA_ABIERTA`, `LOGIN`, `CAMBIO_ROL`, etc.

### 2.2 Flujo objetivo (máquina de estados + dinero)

```
PENDIENTE_PAGO
   │ pago confirmado (DEMO/Stripe)
   ▼
PAGADO  ──►  ledger: RETENCION (fondos en garantía)
   │         genera Código de Entrega (PIN 6 díg.) → hash + QR para el COMPRADOR
   │         autoLiberaEn = ENVIADO + N días
   ▼ (vendedor)
EN_PREPARACION ──► ENVIADO (adjunta guía/comprobante logístico)
   │
   │  ENTREGA FÍSICA — confirmación verificable (una de dos):
   │   (a) Auto-confirmación: el COMPRADOR escanea su QR / pulsa "Confirmar recepción"
   │   (b) Handshake (recomendado): el repartidor/vendedor ingresa el código que el
   │       comprador le muestra al recibir  ← prueba de entrega real
   ▼
ENTREGADO ──►  ledger: LIBERACION (retenido → disponible)  +  fondosLiberadosEn = now
   ▼
COMPLETADO (tras ventana de reseña / cierre)
```

- **Cancelación / disputa a favor del comprador:** `REEMBOLSO` sobre lo retenido (nunca se
  liberó), sin tocar disponible.

### 2.3 Seguridad del código de entrega
- PIN de 6 dígitos generado con CSPRNG; se guarda **solo el hash** (sha256+sal o bcrypt).
- **Un solo uso** + expiración (`codigoEntregaExp`).
- **Anti–fuerza bruta:** máx. 5 intentos → `codigoBloqueadoHasta` (p. ej. 15 min) + evento
  `INTENTO_CODIGO_FALLIDO` + notificación al comprador.
- **Idempotencia:** la liberación verifica `fondosLiberadosEn == null` y reusa el guard
  `existeMovimiento(ordenId, 'LIBERACION')` (igual patrón que hoy).
- Mutación `confirmarEntregaConCodigo(ordenId, codigo)` con **rate-limit** por usuario/orden.

### 2.4 Auto-liberación (respaldo al vendedor)
- Si `ENVIADO` + `autoLiberaEn` vencida, **sin disputa** → `LIBERACION` automática.
- Implementación: job programado (cron) **o** verificación perezosa al leer la orden/saldo
  (más simple, sin infra de cron). Recomendado: verificación on-read + barrido nocturno.
- Notifica a ambas partes ("fondos liberados automáticamente por no haber reclamo").

### 2.5 UI
- **Comprador (detalle de orden):** tarjeta "Código de Entrega" con **QR + PIN**, botón
  **"Confirmar recepción"**, y contador "se liberará automáticamente en N días".
- **Vendedor:** pantalla "Confirmar entrega con código" (handshake) + en su panel de saldo,
  separar **Retenido (en garantía)** vs **Disponible para retiro**.
- **Sello "Compra Protegida NexCom"** en la ficha de producto y el checkout (confianza).

### 2.6 Tareas
1. Migración Prisma (enum + campos de `Orden` + `EventoSeguridad`). **✅ HECHO**
2. `saldos`: `registrarRetencion`, `liberarFondos`, `getSaldo` con retenido/disponible. **✅ HECHO**
3. `pagos._confirmarOrden`: emitir `RETENCION` + generar código + (autoLiberaEn al ENVIAR). **✅ HECHO**
4. `ordenes`: `confirmarEntregaConCodigo` (anti-bruteforce, idempotente, ENTREGADO,
   `liberarFondos`) + `marcarEntregada` libera. **✅ HECHO**
5. Auto-liberación (verificación perezosa al leer órdenes del vendedor). **✅ HECHO**
6. UI comprador (QR+PIN+confirmar) / vendedor (confirmar con código) / saldo (en garantía). **✅ HECHO**
7. Tests: retención/liberación idempotentes + saldos; flujo verificado end-to-end. **✅ HECHO**

> Nota: el código se guarda en claro pero expuesto **solo** al comprador dueño (control de
> acceso). Endurecer a hash + envío por correo queda como mejora futura. Disputas = Épica 2.

> **REDISEÑO (jul 2026, implementado):** la mecánica se invirtió al flujo definitivo de
> recojo por escaneo: el QR viaja **físicamente con el paquete** (el VENDEDOR imprime la
> etiqueta `EtiquetaPaquete` y solo él ve el código; al comprador nunca se le expone).
> El COMPRADOR confirma con `iniciarRecojo` (OTP temporal 10 min) + `confirmarRecojo`
> (escaneo con cámara / código manual), que valida 5 condiciones: autenticado, pertenencia,
> QR válido (anti–fuerza bruta), QR no usado y OTP vigente → ENTREGADO + LIBERACION.
> `confirmarEntregaConCodigo` (handshake del vendedor) se eliminó: con el vendedor
> conociendo el código, le habría permitido auto-liberarse los fondos. Extras: aviso al
> comprador al ENVIAR y cierre automático ENTREGADO→COMPLETADO a los 7 días.

### 2.7 Criterios de aceptación
- El vendedor **no** puede retirar fondos de una orden hasta que esté `ENTREGADO`.
- Confirmar con código correcto libera **exactamente una vez** (sin doble crédito).
- 5 códigos errados bloquean temporalmente y registran evento.
- Una orden enviada sin confirmar se auto-libera tras N días salvo disputa.

---

## 3. ÉPICA 2 — Disputas / Reclamos con mediación  *(protege al comprador)* — ✅ HECHO

> Módulo `disputas` (4 capas) + UI comprador/admin. El comprador reclama durante la
> garantía; el admin media (reembolso desde escrow o liberación). Auto-liberación
> congelada con disputa abierta. Migración aplicada. Verificado end-to-end.

- El comprador abre **reclamo** dentro de la ventana (motivos: *no recibí*, *producto
  incorrecto/dañado*) con **evidencia (foto)** → `disputaAbierta = true` (congela
  auto-liberación).
- **Admin media** desde su panel: resuelve a favor del **comprador** (`REEMBOLSO` desde el
  escrow) o del **vendedor** (`LIBERACION`). Toda resolución deja evento de auditoría.
- Reutiliza/extiende los módulos **`devoluciones`** y **`reportes`** existentes.
- Métrica nueva en Analítica admin: **tasa de disputas** y **monto en garantía** (riesgo).

**Tareas:** modelo `Disputa` (o extender devoluciones) · mutaciones abrir/resolver · UI
comprador (abrir+evidencia) · UI admin (cola de mediación) · tests. **PENDIENTE**

---

## 4. ÉPICA 3 — Seguridad de cuenta y plataforma  *(endurecimiento)* — 🟡 PARCIAL

- ✅ **Throttling de login por cuenta** (Redis): 5 fallos/15min → bloqueo 15min; complementa
  el rate-limit global por IP; falla en abierto si Redis cae. Audita LOGIN_FALLIDO/BLOQUEADO.
- ✅ **Audit log consultable por el admin**: query `eventosSeguridad` + página `/admin/seguridad`
  (timeline con filtros). Evento `RETIRO_SOLICITADO` añadido.
- ✅ **Confirmar entrega con código** ya tenía anti-bruteforce por orden (Épica 1).
- ⏳ **OTP por email en retiros / cambio de datos de cobro** — **PENDIENTE: requiere SMTP
  (MAIL_*) configurado en producción.** Sin un mailer operativo, el OTP dejaría a los
  vendedores sin poder retirar. Implementar tras confirmar el correo saliente.

**Tareas:** throttling ✅ · panel auditoría ✅ · tests ✅ · OTP retiros ⏳ (config externa).

---

## 5. ÉPICA 4 — Innovación / anti-fraude  *(alto valor)* — 🟡 PARCIAL

- ✅ **Scoring de riesgo de vendedores**: `calcularRiesgoVendedor` (cancelaciones + disputas +
  disputas perdidas + KYC) → score 0–100 / nivel + factores. Query `riesgoVendedores` y panel
  rankeado en `/admin/seguridad`. Tests unitarios del scoring.
- ✅ **KYC ligero ligado a retiros**: `verificarVendedor` (admin) + `solicitarRetiro` exige
  vendedor verificado; banner en el panel de saldo. Test del gate.
- ✅ **Sello "Compra Protegida"** en el carrito (confianza).
- ⏳ **Seguimiento logístico simulado** (timeline origen→destino + ETA) — pendiente (UX, sin
  impacto de seguridad; se puede sumar luego).

---

## 6. Orden de implementación recomendado (óptimo)

```
Épica 1  (núcleo, desbloquea el resto)
  1. Migración (datos)             → base
  2. Ledger retención/liberación   → contabilidad
  3. Generación de código en pago  → emisión
  4. Confirmar entrega con código  → liberación segura
  5. Auto-liberación               → respaldo
  6. UI comprador + vendedor       → experiencia
  7. Tests                         → garantía
Épica 2  (disputas)   ── depende de 1
Épica 3  (OTP/rate-limit/audit) ── independiente, paralelizable
Épica 4  (anti-fraude/KYC/sello) ── al final / oportunista
```

**Principio de optimización:** cada épica termina con `tsc` + tests backend, `tsc` +
`next build` frontend, y commit/push. No se mezcla más de una épica por PR.

---

## 7. Consideraciones técnicas y de seguridad

- **Append-only:** el escrow se modela con movimientos nuevos, sin columna de saldo mutable
  → sin *drift*, auditable.
- **Idempotencia:** liberación/reembolso guardados por `(ordenId, tipo)` + `fondosLiberadosEn`.
- **Secretos:** el PIN nunca se almacena ni loguea en claro (solo hash); QR codifica un token
  de confirmación, no el PIN crudo.
- **Compatibilidad DEMO→real:** hoy el dinero es virtual (pago simulado); la lógica de
  retención/liberación es contable e independiente de la pasarela. Al integrar Stripe, la
  `LIBERACION` se mapea a *transfer/capture* y el `REEMBOLSO` a *refund*.
- **Migraciones:** patrón `migrate diff → deploy → generate`; SQL no-Prisma (constraints) se
  antepone a mano.
