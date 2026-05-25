-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'VENDEDOR', 'COMPRADOR');

-- CreateEnum
CREATE TYPE "EstadoOferta" AS ENUM ('PROGRAMADA', 'ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('PENDIENTE', 'REVISANDO', 'RESUELTO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoReporte" AS ENUM ('PRODUCTO', 'VENDEDOR', 'VALORACION', 'OFERTA', 'MENSAJE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'COMPRADOR',
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "dispositivo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_verificacion" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tokens_verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_vendedor" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre_negocio" TEXT NOT NULL,
    "descripcion" TEXT,
    "telefono" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Santa Cruz',
    "logo_url" TEXT,
    "rating_promedio" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_ventas" INTEGER NOT NULL DEFAULT 0,
    "total_resenias" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_comprador" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "telefono" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_comprador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direcciones" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "zona" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Santa Cruz',
    "departamento" TEXT NOT NULL DEFAULT 'Santa Cruz',
    "referencia" TEXT,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icono" TEXT,
    "padre_id" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(12,4) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "total_vendido" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes_producto" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "imagenes_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_etiquetas" (
    "producto_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,

    CONSTRAINT "producto_etiquetas_pkey" PRIMARY KEY ("producto_id","etiqueta_id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritos" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_carrito" (
    "id" TEXT NOT NULL,
    "carrito_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_snapshot" DECIMAL(12,4) NOT NULL,
    "agregado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "descuento" DECIMAL(5,2) NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoOferta" NOT NULL DEFAULT 'PROGRAMADA',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ofertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_productos" (
    "oferta_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,

    CONSTRAINT "oferta_productos_pkey" PRIMARY KEY ("oferta_id","producto_id")
);

-- CreateTable
CREATE TABLE "cupones" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(10,4) NOT NULL,
    "monto_minimo" DECIMAL(12,4),
    "max_usos" INTEGER,
    "usos_actuales" INTEGER NOT NULL DEFAULT 0,
    "vendedor_id" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usos_cupon" (
    "id" TEXT NOT NULL,
    "cupon_id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "descuento" DECIMAL(12,4) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usos_cupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "direccion_id" TEXT,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "subtotal" DECIMAL(12,4) NOT NULL,
    "descuento_cupon" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,4) NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "comprobante_url" TEXT,
    "notas" TEXT,
    "direccion_snapshot" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "nombre_snapshot" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,4) NOT NULL,
    "subtotal" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "items_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "estado_anterior" "EstadoOrden",
    "estado_nuevo" "EstadoOrden" NOT NULL,
    "cambiado_por_id" TEXT NOT NULL,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "monto" DECIMAL(12,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "metodo" TEXT NOT NULL,
    "stripe_charge_id" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valoraciones" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valoraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_valoracion" (
    "id" TEXT NOT NULL,
    "valoracion_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_valoracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "conversacion_id" TEXT NOT NULL,
    "emisor_id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" TEXT NOT NULL,
    "reportador_id" TEXT NOT NULL,
    "tipo" "TipoReporte" NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoReporte" NOT NULL DEFAULT 'PENDIENTE',
    "resuelto_por_id" TEXT,
    "resolucion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_en" TIMESTAMP(3),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "orden_id" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_revocado_idx" ON "refresh_tokens"("usuario_id", "revocado");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_verificacion_token_key" ON "tokens_verificacion"("token");

-- CreateIndex
CREATE INDEX "tokens_verificacion_usuario_id_tipo_idx" ON "tokens_verificacion"("usuario_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_vendedor_usuario_id_key" ON "perfiles_vendedor"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_comprador_usuario_id_key" ON "perfiles_comprador"("usuario_id");

-- CreateIndex
CREATE INDEX "direcciones_comprador_id_es_principal_idx" ON "direcciones"("comprador_id", "es_principal");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "productos_vendedor_id_activo_idx" ON "productos"("vendedor_id", "activo");

-- CreateIndex
CREATE INDEX "productos_categoria_id_activo_idx" ON "productos"("categoria_id", "activo");

-- CreateIndex
CREATE INDEX "productos_activo_destacado_idx" ON "productos"("activo", "destacado");

-- CreateIndex
CREATE INDEX "productos_precio_idx" ON "productos"("precio");

-- CreateIndex
CREATE INDEX "imagenes_producto_producto_id_orden_idx" ON "imagenes_producto"("producto_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_nombre_key" ON "etiquetas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_slug_key" ON "etiquetas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_comprador_id_producto_id_key" ON "favoritos"("comprador_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "carritos_comprador_id_key" ON "carritos"("comprador_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_carrito_carrito_id_producto_id_key" ON "items_carrito"("carrito_id", "producto_id");

-- CreateIndex
CREATE INDEX "ofertas_vendedor_id_estado_idx" ON "ofertas"("vendedor_id", "estado");

-- CreateIndex
CREATE INDEX "ofertas_fecha_fin_estado_idx" ON "ofertas"("fecha_fin", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "cupones_codigo_key" ON "cupones"("codigo");

-- CreateIndex
CREATE INDEX "cupones_codigo_activo_idx" ON "cupones"("codigo", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "usos_cupon_orden_id_key" ON "usos_cupon"("orden_id");

-- CreateIndex
CREATE INDEX "usos_cupon_cupon_id_usuario_id_idx" ON "usos_cupon"("cupon_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_stripe_payment_intent_id_key" ON "ordenes"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "ordenes_comprador_id_estado_idx" ON "ordenes"("comprador_id", "estado");

-- CreateIndex
CREATE INDEX "ordenes_vendedor_id_estado_idx" ON "ordenes"("vendedor_id", "estado");

-- CreateIndex
CREATE INDEX "ordenes_estado_creado_en_idx" ON "ordenes"("estado", "creado_en");

-- CreateIndex
CREATE INDEX "historial_estados_orden_orden_id_creado_en_idx" ON "historial_estados_orden"("orden_id", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_orden_id_key" ON "pagos"("orden_id");

-- CreateIndex
CREATE UNIQUE INDEX "valoraciones_orden_id_key" ON "valoraciones"("orden_id");

-- CreateIndex
CREATE INDEX "valoraciones_vendedor_id_calificacion_idx" ON "valoraciones"("vendedor_id", "calificacion");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_valoracion_valoracion_id_key" ON "respuestas_valoracion"("valoracion_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_comprador_id_vendedor_id_producto_id_key" ON "conversaciones"("comprador_id", "vendedor_id", "producto_id");

-- CreateIndex
CREATE INDEX "mensajes_conversacion_id_creado_en_idx" ON "mensajes"("conversacion_id", "creado_en");

-- CreateIndex
CREATE INDEX "mensajes_conversacion_id_leido_idx" ON "mensajes"("conversacion_id", "leido");

-- CreateIndex
CREATE INDEX "reportes_tipo_estado_idx" ON "reportes"("tipo", "estado");

-- CreateIndex
CREATE INDEX "reportes_reportador_id_idx" ON "reportes"("reportador_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leido_idx" ON "notificaciones"("usuario_id", "leido");

-- CreateIndex
CREATE INDEX "notificaciones_creado_en_idx" ON "notificaciones"("creado_en");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_verificacion" ADD CONSTRAINT "tokens_verificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_vendedor" ADD CONSTRAINT "perfiles_vendedor_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_comprador" ADD CONSTRAINT "perfiles_comprador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes_producto" ADD CONSTRAINT "imagenes_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_etiquetas" ADD CONSTRAINT "producto_etiquetas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_etiquetas" ADD CONSTRAINT "producto_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_productos" ADD CONSTRAINT "oferta_productos_oferta_id_fkey" FOREIGN KEY ("oferta_id") REFERENCES "ofertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_productos" ADD CONSTRAINT "oferta_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_cupon" ADD CONSTRAINT "usos_cupon_cupon_id_fkey" FOREIGN KEY ("cupon_id") REFERENCES "cupones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_cupon" ADD CONSTRAINT "usos_cupon_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_direccion_id_fkey" FOREIGN KEY ("direccion_id") REFERENCES "direcciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_orden" ADD CONSTRAINT "historial_estados_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_valoracion" ADD CONSTRAINT "respuestas_valoracion_valoracion_id_fkey" FOREIGN KEY ("valoracion_id") REFERENCES "valoraciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_reportador_id_fkey" FOREIGN KEY ("reportador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "fk_reporte_valoracion" FOREIGN KEY ("referencia_id") REFERENCES "valoraciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
