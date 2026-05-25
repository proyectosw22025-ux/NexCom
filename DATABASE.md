# DISEÑO Y ANÁLISIS DE BASE DE DATOS — NEXCOM
> Análisis profundo de entidades, relaciones, cardinalidades y escalabilidad
> Motor: PostgreSQL 17 | ORM: Prisma 5 | Proyecto: NexCom — UAGRM, Santa Cruz, Bolivia

---

## 1. DIAGRAMA ENTIDAD-RELACIÓN COMPLETO

```
                        ┌─────────────────────────────────────┐
                        │              USUARIOS                │
                        │─────────────────────────────────────│
                        │ PK  id            CUID              │
                        │     email         VARCHAR UNIQUE     │
                        │     password_hash VARCHAR            │
                        │     rol           ENUM(ROL)          │
                        │     verificado    BOOLEAN            │
                        │     activo        BOOLEAN            │
                        │     creado_en     TIMESTAMP          │
                        │     actualizado_en TIMESTAMP         │
                        └──────────────┬──────────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────────┐
              │ 1:1 (composición)      │ 1:1 (composición)        │ 1:N (composición)
              ▼                        ▼                           ▼
┌─────────────────────┐  ┌───────────────────────┐  ┌───────────────────────────┐
│  PERFILES_VENDEDOR  │  │  PERFILES_COMPRADOR   │  │   TOKENS_VERIFICACION     │
│─────────────────────│  │───────────────────────│  │───────────────────────────│
│ PK  id              │  │ PK  id                │  │ PK  id                    │
│ FK  usuario_id ◄────┤  │ FK  usuario_id ◄──────┤  │ FK  usuario_id ◄──────────┤
│     nombre_negocio  │  │     nombre_completo   │  │     token    VARCHAR UNIQ │
│     descripcion     │  │     telefono          │  │     tipo     VARCHAR       │
│     telefono        │  │     direccion         │  │     expira_en TIMESTAMP   │
│     ciudad          │  │     ciudad            │  │     usado    BOOLEAN       │
│     logo_url        │  └─────────┬─────────────┘  └───────────────────────────┘
│     rating_promedio │            │ 1:N (asociación)
│     total_ventas    │            │
└────────┬────────────┘            │
         │                         │
         │ 1:N (composición)       │
         │                         │
         ├─────────────────────────┼─────────────────────────────────────┐
         │                         │                                     │
         ▼                         ▼                                     │
┌────────────────────┐   ┌─────────────────────────────────────┐        │
│     PRODUCTOS      │   │              ORDENES                │        │
│────────────────────│   │─────────────────────────────────────│        │
│ PK  id             │   │ PK  id                              │        │
│ FK  vendedor_id ◄──┘   │ FK  comprador_id ◄──────────────────┘        │
│ FK  categoria_id        │ FK  vendedor_id  ◄────────────────────────────┘
│     nombre              │     estado       ENUM(ESTADO_ORDEN)
│     descripcion         │     subtotal     DECIMAL(12,4)
│     precio DECIMAL      │     total        DECIMAL(12,4)
│     stock  INTEGER      │     stripe_pi_id VARCHAR UNIQUE
│     activo BOOLEAN      │     comprobante_url VARCHAR
│     creado_en           │     creado_en    TIMESTAMP
└────────┬────────────────└─────────┬───────────────────────────────────
         │                          │
    ┌────┴───┐               ┌──────┼──────────────────────┐
    │        │               │      │                       │
    ▼        ▼               ▼      ▼                       ▼
┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────────────┐
│IMAGENES│ │CATEGORIAS│ │ ITEMS  │ │  PAGOS   │ │  VALORACIONES    │
│PRODUCTO│ │          │ │ ORDEN  │ │          │ │                  │
│────────│ │──────────│ │────────│ │──────────│ │──────────────────│
│PK id   │ │PK id     │ │PK id   │ │PK id     │ │PK id             │
│FK prod_│ │  nombre  │ │FK ord_id│ │FK ord_id │ │FK orden_id UNIQ  │
│   id   │ │  slug    │ │FK prod_│ │  monto   │ │FK comprador_id   │
│   url  │ │  icono   │ │   id   │ │  moneda  │ │FK vendedor_id    │
│   orden│ │FK padre_id│ │  cant  │ │  metodo  │ │   calificacion   │
└────────┘ │  (self)  │ │  p_unit│ │  stripe_ │ │   comentario     │
           └──────────┘ │  subt  │ │  charge_id│ │   creado_en      │
                        └────────┘ │  estado  │ └──────────────────┘
                                   └──────────┘
                                   
┌──────────────────────────────────────────┐
│              OFERTAS                     │
│──────────────────────────────────────────│
│ PK  id                                   │
│ FK  vendedor_id ◄── PerfilVendedor        │
│     titulo        VARCHAR                │
│     descripcion   TEXT                   │
│     descuento     DECIMAL(5,2)           │
│     fecha_inicio  TIMESTAMP              │
│     fecha_fin     TIMESTAMP              │
│     estado        ENUM(ESTADO_OFERTA)    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│             NOTIFICACIONES               │
│──────────────────────────────────────────│
│ PK  id                                   │
│ FK  usuario_id ◄── Usuario               │
│ FK  orden_id   ◄── Orden (nullable)      │
│     tipo       VARCHAR                   │
│     mensaje    TEXT                      │
│     leido      BOOLEAN                   │
│     creado_en  TIMESTAMP                 │
└──────────────────────────────────────────┘
```

---

## 2. ANÁLISIS DE CARDINALIDADES Y TIPOS DE RELACIÓN

### CONVENCIÓN

```
─────   Asociación simple      (los objetos son independientes)
━━━━━   Agregación             (el todo puede existir sin las partes)
▓▓▓▓▓   Composición            (las partes no existen sin el todo)
═════   Herencia / Especialización

1    Exactamente uno
0..1 Cero o uno (opcional)
N    Muchos
1..N Uno o más
```

---

### RELACIÓN 1 — Usuario → PerfilVendedor
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 Usuario ──▓▓──► 0..1 PerfilVendedor`

```
Un Usuario tiene CERO o UN PerfilVendedor.
Un PerfilVendedor pertenece a EXACTAMENTE UN Usuario.
```

**Justificación técnica**:
- Se usa composición porque el `PerfilVendedor` no tiene significado sin el `Usuario`.
- Si el `Usuario` es eliminado, el `PerfilVendedor` debe eliminarse (`onDelete: Cascade`).
- Solo los usuarios con `rol = VENDEDOR` tendrán este perfil.

**Restricción de negocio importante**:
> En el diseño actual, un usuario NO puede ser simultáneamente vendedor y comprador.
> Esta es una decisión de MVP. Para escalar, se puede cambiar el modelo de roles
> a una tabla `usuario_roles` (N:M) que permita múltiples roles por usuario.

**Índice requerido**: `UNIQUE(usuario_id)` → ya garantizado por la FK con restricción única.

---

### RELACIÓN 2 — Usuario → PerfilComprador
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 Usuario ──▓▓──► 0..1 PerfilComprador`

Misma lógica que la relación 1. Solo los usuarios con `rol = COMPRADOR` tienen este perfil.

**Decisión de escalabilidad**:
> Si en el futuro se implementa un sistema donde un mismo usuario pueda comprar
> Y vender (como en Mercado Libre), ambos perfiles pueden coexistir para el mismo
> usuario sin cambiar las tablas. Solo se requiere modificar la validación en el backend.

---

### RELACIÓN 3 — Usuario → TokenVerificacion
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 Usuario ──▓▓──► 0..N TokenVerificacion`

```
Un Usuario puede tener CERO o MUCHOS tokens (uno por cada solicitud de verificación
o reseteo de contraseña).
Un Token pertenece a EXACTAMENTE UN Usuario.
```

**Por qué múltiples tokens**:
- El usuario puede solicitar el email de verificación múltiples veces.
- El usuario puede solicitar múltiples resets de contraseña.
- Cada uno genera un token diferente con su propio TTL.

**Índice requerido**: `UNIQUE(token)` → búsqueda O(1) al verificar.

---

### RELACIÓN 4 — PerfilVendedor → Producto
**Tipo**: COMPOSICIÓN fuerte  
**Cardinalidad**: `1 PerfilVendedor ──▓▓──► 0..N Producto`

```
Un Vendedor puede tener CERO o MUCHOS productos.
Un Producto pertenece a EXACTAMENTE UN Vendedor.
```

**Decisión crítica de diseño**:
> Un producto NO puede pertenecer a múltiples vendedores. Esto es correcto para
> NexCom (marketplace de vendedores independientes). No es como Amazon donde
> múltiples sellers venden el mismo producto. Cada producto es único del vendedor.

**Cascade behavior**:
- Si se elimina al vendedor → ¿se eliminan sus productos? 
- **Recomendación**: NO cascade delete. En su lugar: `activo = false`.
- Las órdenes pasadas que referencian esos productos deben mantenerse por auditoría.

**Índice requerido**: `INDEX(vendedor_id)` + `INDEX(vendedor_id, activo)`.

---

### RELACIÓN 5 — Producto → ImagenProducto
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 Producto ──▓▓──► 1..N ImagenProducto`

```
Un Producto tiene UNA o MUCHAS imágenes.
Una Imagen pertenece a EXACTAMENTE UN Producto.
```

**Decisión de diseño — URL vs BLOB**:
```
❌ INCORRECTO: Guardar la imagen como BYTEA (blob) en PostgreSQL
   → La DB se infla enormemente, los backups son gigantes,
     las queries lentas para paginar.

✅ CORRECTO: Guardar solo la URL de la imagen
   → Dev local: ruta relativa al filesystem del servidor
   → Producción: URL de S3/Cloudflare R2/Cloudinary
   
El campo `orden` (INT) define el orden de aparición en la galería.
La imagen con orden=0 es la imagen principal (thumbnail).
```

**Límite de negocio recomendado**: máximo 5 imágenes por producto (enforced en el service, no en la DB).

---

### RELACIÓN 6 — Categoria → Categoria (Árbol)
**Tipo**: AUTO-REFERENCIA (Herencia estructural / árbol jerárquico)  
**Cardinalidad**: `0..1 Categoria ──────► 0..N Categoria (hijos)`

```
Una Categoría puede tener UN padre (nullable → categoría raíz si es null).
Una Categoría puede tener CERO o MUCHOS hijos.

Ejemplo:
  Electrónica (padre_id = null)       ← Nivel 1 (raíz)
  ├── Teléfonos (padre_id = electrónica)   ← Nivel 2
  │   ├── Smartphones                      ← Nivel 3
  │   └── Feature Phones
  └── Computadoras
```

**Decisión de profundidad**:
> Para NexCom MVP: máximo 2 niveles (categoría → subcategoría).
> La DB soporta N niveles, pero la UI se diseña para 2.
> Si se necesita más profundidad en el futuro, la DB ya lo soporta sin cambios.

**Índice requerido**: `UNIQUE(slug)` → para URLs amigables `/categoria/electronica`.

---

### RELACIÓN 7 — Categoria → Producto
**Tipo**: AGREGACIÓN  
**Cardinalidad**: `1 Categoria ──━━──► 0..N Producto`

```
Una Categoría puede tener CERO o MUCHOS Productos.
Un Producto pertenece a EXACTAMENTE UNA Categoría.
```

**Por qué AGREGACIÓN y no COMPOSICIÓN**:
> La categoría NO es dueña de los productos. Si se elimina una categoría,
> los productos no deberían eliminarse automáticamente — deberían moverse
> a una categoría "Sin categoría" o "General".
> Por esto: `onDelete: SetDefault` o manejo manual en el service.

**Limitación del diseño actual**:
> Un producto solo pertenece a UNA categoría. Para escalabilidad real,
> se puede migrar a una tabla intermedia `producto_categorias` (N:M) que permita
> que un producto aparezca en múltiples categorías.

---

### RELACIÓN 8 — PerfilVendedor → Oferta
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 PerfilVendedor ──▓▓──► 0..N Oferta`

```
Un Vendedor puede tener CERO o MUCHAS Ofertas.
Una Oferta pertenece a EXACTAMENTE UN Vendedor.
```

**Limitación crítica identificada — Oferta ↔ Producto**:
> En el diseño actual, una Oferta es a nivel de VENDEDOR (promoción general),
> no a nivel de PRODUCTO específico.
>
> Esto significa que no se puede hacer "20% de descuento en el producto X".
> Solo se puede hacer "este vendedor tiene una promoción activa".
>
> Para Sprint 1-2 esto es suficiente. Para escalar, agregar:

```sql
-- Tabla futura: oferta_productos (N:M)
CREATE TABLE oferta_productos (
  oferta_id   VARCHAR NOT NULL REFERENCES ofertas(id),
  producto_id VARCHAR NOT NULL REFERENCES productos(id),
  PRIMARY KEY (oferta_id, producto_id)
);
```

---

### RELACIÓN 9 — PerfilComprador + PerfilVendedor → Orden
**Tipo**: ASOCIACIÓN  
**Cardinalidad**:
```
1 PerfilComprador ──────► 0..N Orden   (un comprador hace muchas órdenes)
1 PerfilVendedor  ──────► 0..N Orden   (un vendedor recibe muchas órdenes)
1 Orden           ──────► 1 PerfilComprador (siempre hay un comprador)
1 Orden           ──────► 1 PerfilVendedor  (siempre hay un vendedor)
```

**Restricción de negocio crítica**:
> Una Orden es siempre entre UN comprador y UN vendedor.
> Esto significa que si el comprador tiene productos de 2 vendedores en el carrito,
> se crean 2 órdenes separadas.
>
> Esta es la arquitectura correcta para un marketplace descentralizado como NexCom.
> (Mercado Libre hace lo mismo internamente).

**Índices requeridos**:
```sql
INDEX(comprador_id, estado)     -- "mis órdenes" filtradas por estado
INDEX(vendedor_id, estado)      -- "órdenes recibidas" filtradas por estado
INDEX(estado, creado_en)        -- panel admin: todas las órdenes por fecha
INDEX(stripe_payment_intent_id) -- UNIQUE, búsqueda desde webhook
```

---

### RELACIÓN 10 — Orden → ItemOrden
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 Orden ──▓▓──► 1..N ItemOrden`

```
Una Orden tiene UNO o MUCHOS Items (al menos 1, no puede haber orden vacía).
Un Item pertenece a EXACTAMENTE UNA Orden.
```

**Decisión de precio histórico**:
> `precio_unitario` en `ItemOrden` guarda el precio AL MOMENTO de la compra.
> Esto es FUNDAMENTAL: si el vendedor cambia el precio del producto después,
> la orden histórica sigue mostrando el precio original.
> NUNCA hacer JOIN con `productos.precio` para mostrar el precio de una orden pasada.

**La fórmula**:
```
ItemOrden.subtotal = ItemOrden.precio_unitario × ItemOrden.cantidad
Orden.subtotal     = SUM(ItemOrden.subtotal)
Orden.total        = Orden.subtotal  (+ envío futuro, - descuentos futuros)
```
Todos calculados con `decimal.js` — NUNCA con aritmética de punto flotante JS.

---

### RELACIÓN 11 — Orden → Pago
**Tipo**: COMPOSICIÓN  
**Cardinalidad**: `1 Orden ──▓▓──► 0..1 Pago`

```
Una Orden tiene CERO o UN Pago.
  → CERO: la orden fue creada pero aún no pagada (PENDIENTE_PAGO)
  → UNO:  el pago fue procesado por Stripe
Un Pago pertenece a EXACTAMENTE UNA Orden.
```

**Por qué tabla separada y no campos en Orden**:
> La tabla `Pagos` permite en el futuro:
> - Registrar intentos de pago fallidos
> - Soportar múltiples métodos de pago por orden (tarjeta + QR)
> - Auditoría completa de transacciones financieras
> - Reembolsos parciales (registrar nuevo Pago con tipo REEMBOLSO)

**Restricción DB**: `UNIQUE(orden_id)` en `pagos` — solo un pago activo por orden.

---

### RELACIÓN 12 — Orden → Valoracion
**Tipo**: COMPOSICIÓN débil  
**Cardinalidad**: `1 Orden ──━━──► 0..1 Valoracion`

```
Una Orden puede tener CERO o UNA Valoración.
Una Valoración existe para EXACTAMENTE UNA Orden.
```

**Regla de negocio enforced por DB**:
```sql
UNIQUE(orden_id)  -- máximo una valoración por orden (ya está en el schema)
```

**Regla de negocio enforced por la aplicación** (NO por DB):
```
La valoración solo puede crearse si:
  1. orden.estado = 'COMPLETADO'
  2. el usuario autenticado es el comprador de esa orden
  3. no existe ya una valoracion para esa orden
```

**¿Por qué no enforced por DB la regla 1?**:
> PostgreSQL puede hacerlo con un CHECK CONSTRAINT + función, pero complica
> el schema. Para equipos pequeños es más mantenible en la capa de servicio.

---

### RELACIÓN 13 — Valoracion → PerfilVendedor (rating desnormalizado)
**Tipo**: ASOCIACIÓN con desnormalización  
**Cardinalidad**: `1 PerfilVendedor ──────► 0..N Valoracion`

**El campo `rating_promedio` en `PerfilVendedor` es DESNORMALIZADO**:

```
❌ Enfoque normalizado (no usar):
   SELECT AVG(calificacion) FROM valoraciones WHERE vendedor_id = $1
   → Se ejecuta en cada lectura del perfil. Costoso a escala.

✅ Enfoque desnormalizado (usar):
   PerfilVendedor.rating_promedio se actualiza SOLO cuando llega
   una nueva valoración:
   
   nuevo_promedio = (rating_actual × total_valoraciones + nueva_calificacion)
                    / (total_valoraciones + 1)
   
   Calculado con decimal.js, guardado como DECIMAL(3,2) en la DB.
```

**Riesgo**: Si el cálculo falla, el promedio queda desincronizado.  
**Mitigación**: Job nocturno que recalcula el promedio de todos los vendedores.

---

### RELACIÓN 14 — Usuario → Notificacion
**Tipo**: AGREGACIÓN  
**Cardinalidad**: `1 Usuario ──━━──► 0..N Notificacion`

```
Un Usuario puede tener CERO o MUCHAS Notificaciones.
Una Notificación pertenece a EXACTAMENTE UN Usuario.
La Notificación puede o no estar asociada a una Orden (nullable).
```

**Tipos de notificaciones en NexCom**:

| Tipo | Receptor | Trigger |
|---|---|---|
| `ORDEN_NUEVA` | VENDEDOR | Comprador crea una orden |
| `PAGO_CONFIRMADO` | COMPRADOR + VENDEDOR | Stripe webhook confirma pago |
| `ORDEN_EN_PREPARACION` | COMPRADOR | Vendedor cambia estado |
| `ORDEN_ENVIADA` | COMPRADOR | Vendedor marca como enviado |
| `ORDEN_ENTREGADA` | VENDEDOR | Comprador confirma recepción |
| `ORDEN_COMPLETADA` | COMPRADOR | Auto: 48h después de ENTREGADO |
| `NUEVA_VALORACION` | VENDEDOR | Comprador deja reseña |

**Escalabilidad de notificaciones**:
> Para MVP: se almacenan en PostgreSQL y se consultan por polling desde el frontend.
> Para escala: se migra a Redis Pub/Sub o WebSockets (Socket.io) sin cambiar la tabla.

---

## 3. PATRÓN DE HERENCIA — USUARIO Y SUS ESPECIALIZACIONES

NexCom usa el patrón **Class Table Inheritance (CTI)**, también conocido como
**Table Per Type (TPT)** en Entity Framework.

```
                    ┌─────────────────────────────────┐
                    │           USUARIOS               │
                    │  (clase base / supertipo)        │
                    │                                  │
                    │  id, email, password_hash, rol   │
                    │  verificado, activo, timestamps  │
                    └─────────────┬───────────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │ discriminador: campo `rol`   │
                   │                              │
         ┌─────────▼──────────┐      ┌───────────▼──────────┐
         │   PERFILES_VENDEDOR│      │  PERFILES_COMPRADOR  │
         │   (subtipo)        │      │  (subtipo)           │
         │                    │      │                      │
         │  nombre_negocio    │      │  nombre_completo     │
         │  rating_promedio   │      │  direccion           │
         │  total_ventas      │      │                      │
         └────────────────────┘      └──────────────────────┘
```

**¿Por qué CTI y no Single Table Inheritance (STI)?**:

| Criterio | STI (una tabla) | CTI (tablas separadas) ← usamos |
|---|---|---|
| Columnas nulas | Muchas (vendedor vs comprador) | Ninguna |
| Queries | Una sola tabla, simple | JOIN necesario |
| Escalabilidad | Tabla crece ancha | Tablas crecen independiente |
| Agregar campos | Agrega columna nullable a todos | Solo afecta la subtabla |
| Integridad | Difícil de enforcar por tipo | Constraints por tabla |

---

## 4. MÁQUINA DE ESTADOS — DIAGRAMA COMPLETO

### Estados de Orden

```
                    [CREACIÓN DE ORDEN]
                           │
                           ▼
                   ┌───────────────┐
                   │ PENDIENTE_PAGO│ ◄── Estado inicial (siempre)
                   └───────┬───────┘
                           │ Webhook Stripe "payment_intent.succeeded"
                           │ (automático, no acción del usuario)
                           ▼
                   ┌───────────────┐
                   │    PAGADO     │ ◄── Orden confirmada por Stripe
                   └───────┬───────┘
                           │ Acción del VENDEDOR: "Empezar preparación"
                           ▼
                   ┌───────────────┐
                   │EN_PREPARACION │ ◄── El vendedor está preparando el pedido
                   └───────┬───────┘
                           │ Acción del VENDEDOR: "Marcar como enviado"
                           ▼
                   ┌───────────────┐
                   │    ENVIADO    │ ◄── En camino al comprador
                   └───────┬───────┘
                           │ Acción del COMPRADOR: "Confirmar recepción"
                           ▼
                   ┌───────────────┐
                   │  ENTREGADO   │ ◄── Comprador dice que lo recibió
                   └───────┬───────┘
                           │ Automático: 48h después O confirmación manual
                           ▼
                   ┌───────────────┐
                   │  COMPLETADO  │ ◄── Habilita la valoración
                   └───────────────┘

  CANCELADO ◄── puede ocurrir desde: PENDIENTE_PAGO o PAGADO (antes de EN_PREPARACION)
```

**Transiciones válidas e inválidas** (enforced en `ordenes.service.ts`):

```typescript
const transicionesValidas: Record<EstadoOrden, EstadoOrden[]> = {
  PENDIENTE_PAGO:   ['PAGADO', 'CANCELADO'],
  PAGADO:           ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION:   ['ENVIADO'],
  ENVIADO:          ['ENTREGADO'],
  ENTREGADO:        ['COMPLETADO'],
  COMPLETADO:       [],          // estado final — no hay vuelta
  CANCELADO:        [],          // estado final — no hay vuelta
};
```

### Estados de Oferta

```
[PUBLICACIÓN]
     │ fechaInicio > now()          │ fechaInicio <= now()
     ▼                              ▼
PROGRAMADA  ──────────────────► ACTIVA ──► VENCIDA (fechaFin < now())
     │                                         │
     └────────────────► CANCELADA ◄────────────┘
                   (acción del vendedor en cualquier momento)
```

---

## 5. CONSTRAINTS DE INTEGRIDAD — BASE DE DATOS

Restricciones que se deben agregar al schema de Prisma para garantizar integridad:

```prisma
model Producto {
  precio  Decimal @db.Decimal(12, 4)
  stock   Int
  
  // Agregar en migración manual:
  // CHECK (precio > 0)
  // CHECK (stock >= 0)
}

model Valoracion {
  calificacion Int
  
  // Agregar en migración manual:
  // CHECK (calificacion BETWEEN 1 AND 5)
}

model Oferta {
  descuento   Decimal @db.Decimal(5, 2)
  fechaInicio DateTime
  fechaFin    DateTime
  
  // Agregar en migración manual:
  // CHECK (descuento > 0 AND descuento <= 100)
  // CHECK (fecha_fin > fecha_inicio)
}

model ItemOrden {
  cantidad       Int
  precioUnitario Decimal @db.Decimal(12, 4)
  
  // Agregar en migración manual:
  // CHECK (cantidad > 0)
  // CHECK (precio_unitario > 0)
}
```

**Cómo agregar CHECKs con Prisma** (raw migration):
```sql
-- En una migración SQL directa
ALTER TABLE productos
  ADD CONSTRAINT chk_precio_positivo CHECK (precio > 0),
  ADD CONSTRAINT chk_stock_no_negativo CHECK (stock >= 0);

ALTER TABLE valoraciones
  ADD CONSTRAINT chk_calificacion_rango CHECK (calificacion BETWEEN 1 AND 5);

ALTER TABLE ofertas
  ADD CONSTRAINT chk_descuento_rango CHECK (descuento > 0 AND descuento <= 100),
  ADD CONSTRAINT chk_fechas_oferta CHECK (fecha_fin > fecha_inicio);
```

---

## 6. ÍNDICES PARA RENDIMIENTO — 100 USUARIOS CONCURRENTES

### Índices críticos de producción

```sql
-- ── USUARIOS ─────────────────────────────────────────────────
-- Ya existe: UNIQUE(email) por constraint

-- ── PRODUCTOS (las queries más frecuentes del sistema) ─────────
CREATE INDEX idx_productos_vendedor     ON productos(vendedor_id);
CREATE INDEX idx_productos_categoria    ON productos(categoria_id);
CREATE INDEX idx_productos_activo_fecha ON productos(activo, creado_en DESC);
CREATE INDEX idx_productos_precio       ON productos(precio);

-- Full-Text Search en español
CREATE INDEX idx_productos_fts ON productos
  USING gin(to_tsvector('spanish', nombre || ' ' || coalesce(descripcion, '')));

-- ── ÓRDENES ─────────────────────────────────────────────────
CREATE INDEX idx_ordenes_comprador_estado ON ordenes(comprador_id, estado);
CREATE INDEX idx_ordenes_vendedor_estado  ON ordenes(vendedor_id, estado);
CREATE INDEX idx_ordenes_estado_fecha     ON ordenes(estado, creado_en DESC);
-- Ya existe: UNIQUE(stripe_payment_intent_id)

-- ── OFERTAS ─────────────────────────────────────────────────
CREATE INDEX idx_ofertas_vendedor_estado  ON ofertas(vendedor_id, estado);
CREATE INDEX idx_ofertas_vencimiento      ON ofertas(fecha_fin, estado);
-- Este índice es usado por el cron job de vencimiento automático

-- ── VALORACIONES ────────────────────────────────────────────
CREATE INDEX idx_valoraciones_vendedor    ON valoraciones(vendedor_id);
CREATE INDEX idx_valoraciones_comprador   ON valoraciones(comprador_id);

-- ── NOTIFICACIONES ──────────────────────────────────────────
CREATE INDEX idx_notificaciones_usuario_leido ON notificaciones(usuario_id, leido);
CREATE INDEX idx_notificaciones_creado_en     ON notificaciones(creado_en DESC);

-- ── TOKENS ──────────────────────────────────────────────────
-- Ya existe: UNIQUE(token)
CREATE INDEX idx_tokens_usuario_tipo ON tokens_verificacion(usuario_id, tipo);
```

---

## 7. ANÁLISIS DE ESCALABILIDAD — DEL MVP AL DEPLOY

### Etapa Actual (MVP — 100 usuarios, Santa Cruz)

```
PostgreSQL 17 single instance
    └── Todas las tablas en una sola base de datos
    └── Conexiones: Prisma Connection Pool (max: 10 conexiones)
    └── Backup: pg_dump diario automatizado
```

### Etapa 2 (500-1000 usuarios, múltiples ciudades)

```
PostgreSQL Primary + Read Replica
    ├── Primary: escrituras (INSERT, UPDATE, DELETE)
    └── Replica: lecturas (SELECT en listar productos, buscar)
    
Prisma soporta esto nativamente con:
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")           // Primary
      directUrl = env("DATABASE_URL_REPLICA")  // Replica
    }
```

**Tabla `productos`**: Candidata a particionamiento por `ciudad` del vendedor:
```sql
-- Futuro: particionamiento por ciudad
CREATE TABLE productos PARTITION BY LIST (ciudad);
CREATE TABLE productos_santa_cruz PARTITION OF productos FOR VALUES IN ('Santa Cruz');
CREATE TABLE productos_cochabamba PARTITION OF productos FOR VALUES IN ('Cochabamba');
```

### Etapa 3 (10,000+ usuarios, escala regional)

```
Tabla `ordenes`: Particionamiento por rango de fecha (Range Partitioning)
    → Se acumulan millones de órdenes. Las órdenes de 2024 raramente se consultan.
    → Particionar por AÑO-MES mejora queries históricas en órdenes del admin.

CREATE TABLE ordenes PARTITION BY RANGE (creado_en);
CREATE TABLE ordenes_2026 PARTITION OF ordenes
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

Búsqueda: Migrar de PostgreSQL FTS a Elasticsearch / Meilisearch
    → PostgreSQL FTS es suficiente hasta ~100,000 productos
    → Más allá: Elasticsearch con indexación asincrónica
```

---

## 8. RESUMEN EJECUTIVO DE RELACIONES

| Relación | Tipo | Cardinalidad | Cascade Delete |
|---|---|---|---|
| Usuario → PerfilVendedor | Composición | 1:0..1 | SÍ |
| Usuario → PerfilComprador | Composición | 1:0..1 | SÍ |
| Usuario → TokenVerificacion | Composición | 1:0..N | SÍ |
| Usuario → Notificacion | Composición | 1:0..N | SÍ |
| PerfilVendedor → Producto | Composición | 1:0..N | NO (soft delete) |
| PerfilVendedor → Oferta | Composición | 1:0..N | SÍ |
| Categoria → Producto | Agregación | 1:0..N | NO (reasignar) |
| Categoria → Categoria | Auto-referencia | 1:0..N | NO |
| Producto → ImagenProducto | Composición | 1:1..N | SÍ |
| PerfilComprador → Orden | Asociación | 1:0..N | NO (auditoría) |
| PerfilVendedor → Orden | Asociación | 1:0..N | NO (auditoría) |
| Orden → ItemOrden | Composición | 1:1..N | SÍ |
| Orden → Pago | Composición | 1:0..1 | SÍ |
| Orden → Valoracion | Composición débil | 1:0..1 | NO |
| Orden → Notificacion | Agregación | 1:0..N | NO |
| Producto → ItemOrden | Asociación | 1:0..N | NO (histórico) |
| PerfilVendedor → Valoracion | Asociación | 1:0..N | NO |
| PerfilComprador → Valoracion | Asociación | 1:0..N | NO |

---

## 9. PUNTOS CRÍTICOS QUE REQUIEREN ATENCIÓN

### CRÍTICO 1 — Condición de carrera en el Stock

```
Escenario: 2 compradores intentan comprar el último producto al mismo tiempo.

Ambos leen: stock = 1
Ambos crean su orden
Ambos descuentan: stock = 1 - 1 = 0
→ stock = 0 pero se crearon 2 órdenes ← ERROR

Solución: Transacción atómica con SELECT FOR UPDATE en el service:
```

```sql
BEGIN;
  SELECT stock FROM productos WHERE id = $1 FOR UPDATE;
  -- Si stock >= cantidad solicitada:
  UPDATE productos SET stock = stock - $2 WHERE id = $1;
  INSERT INTO items_orden ...;
COMMIT;
```

### CRÍTICO 2 — Integridad referencial en historial de órdenes

```
NO se puede borrar un Producto que tiene ItemOrden asociados.
NO se puede borrar un Usuario que tiene Ordenes asociadas.

Solución: NUNCA hacer hard delete de Productos ni Usuarios.
Usar soft delete: activo = false / verificado = false.
Los datos históricos son sagrados para auditoría y contabilidad.
```

### CRÍTICO 3 — El webhook de Stripe es la única fuente de verdad del pago

```
El frontend NUNCA confirma el pago directamente.
El estado de la Orden solo cambia a PAGADO cuando el webhook de Stripe
llega al backend con el evento "payment_intent.succeeded".

Si el webhook llega tarde o falla:
→ La Orden queda en PENDIENTE_PAGO
→ El cron de limpieza la marca CANCELADO después de 24h sin pago
→ El stock se devuelve (si fue reservado)
```

---

*Documento generado: Mayo 2026 | NexCom Database Design v1.0*
*Próxima revisión: al inicio del Sprint 3 (integración Stripe)*
