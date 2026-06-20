-- CreateEnum
CREATE TYPE "TipoMovimientoSaldo" AS ENUM ('VENTA', 'REEMBOLSO');

-- CreateEnum
CREATE TYPE "EstadoRetiro" AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "movimientos_saldo" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "tipo" "TipoMovimientoSaldo" NOT NULL,
    "monto" DECIMAL(12,4) NOT NULL,
    "comision" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "orden_id" TEXT,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_retiro" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "monto" DECIMAL(12,4) NOT NULL,
    "estado" "EstadoRetiro" NOT NULL DEFAULT 'PENDIENTE',
    "banco" TEXT NOT NULL,
    "numero_cuenta" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "nota_admin" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_en" TIMESTAMP(3),

    CONSTRAINT "solicitudes_retiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_saldo_vendedor_id_creado_en_idx" ON "movimientos_saldo"("vendedor_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimientos_saldo_orden_id_tipo_idx" ON "movimientos_saldo"("orden_id", "tipo");

-- CreateIndex
CREATE INDEX "solicitudes_retiro_vendedor_id_estado_idx" ON "solicitudes_retiro"("vendedor_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_retiro_estado_creado_en_idx" ON "solicitudes_retiro"("estado", "creado_en");

-- AddForeignKey
ALTER TABLE "movimientos_saldo" ADD CONSTRAINT "movimientos_saldo_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_retiro" ADD CONSTRAINT "solicitudes_retiro_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

