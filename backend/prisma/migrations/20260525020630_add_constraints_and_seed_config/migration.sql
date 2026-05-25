-- ══════════════════════════════════════════════════════════════
-- CONSTRAINTS DE INTEGRIDAD — IDEMPOTENTES (IF NOT EXISTS vía DO)
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE productos ADD CONSTRAINT chk_precio_positivo CHECK (precio > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE productos ADD CONSTRAINT chk_stock_no_negativo CHECK (stock >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE productos ADD CONSTRAINT chk_total_vendido CHECK (total_vendido >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE valoraciones ADD CONSTRAINT chk_calificacion_rango CHECK (calificacion BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ofertas ADD CONSTRAINT chk_descuento_rango CHECK (descuento > 0 AND descuento <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ofertas ADD CONSTRAINT chk_fechas_oferta CHECK (fecha_fin > fecha_inicio);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE items_orden ADD CONSTRAINT chk_cantidad_orden CHECK (cantidad > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE items_orden ADD CONSTRAINT chk_precio_unitario CHECK (precio_unitario > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE items_carrito ADD CONSTRAINT chk_cantidad_carrito CHECK (cantidad > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cupones ADD CONSTRAINT chk_valor_cupon CHECK (valor > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cupones ADD CONSTRAINT chk_fechas_cupon CHECK (fecha_fin > fecha_inicio);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════
-- ÍNDICE FULL-TEXT SEARCH EN ESPAÑOL
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_productos_fts ON productos
  USING gin(to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, '')));

-- ══════════════════════════════════════════════════════════════
-- DATOS INICIALES DE CONFIGURACIÓN DEL SISTEMA
-- ══════════════════════════════════════════════════════════════

INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion, actualizado_en) VALUES
  ('comision_porcentaje',      '0',                'NUMBER',  'Porcentaje de comisión por transacción (0 = gratis)',                     NOW()),
  ('max_imagenes_producto',    '5',                'NUMBER',  'Máximo de imágenes por producto',                                         NOW()),
  ('max_productos_vendedor',   '100',              'NUMBER',  'Máximo de productos activos por vendedor',                                NOW()),
  ('cupones_habilitados',      'true',             'BOOLEAN', 'Sistema de cupones activo',                                               NOW()),
  ('email_soporte',            'soporte@nexcom.bo','STRING',  'Email de soporte al usuario',                                            NOW()),
  ('dias_auto_completar_orden','2',                'NUMBER',  'Días desde ENTREGADO para auto-completar la orden',                      NOW()),
  ('ttl_carrito_horas',        '72',               'NUMBER',  'Horas de vida del carrito sin actividad',                                NOW())
ON CONFLICT (clave) DO NOTHING;
