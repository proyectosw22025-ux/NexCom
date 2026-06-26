-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoMovimientoSaldo" ADD VALUE 'RETENCION';
ALTER TYPE "TipoMovimientoSaldo" ADD VALUE 'LIBERACION';

-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN     "auto_libera_en" TIMESTAMP(3),
ADD COLUMN     "codigo_bloqueado_hasta" TIMESTAMP(3),
ADD COLUMN     "codigo_entrega" TEXT,
ADD COLUMN     "fondos_liberados_en" TIMESTAMP(3),
ADD COLUMN     "intentos_codigo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "eventos_seguridad" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuario_id" TEXT,
    "orden_id" TEXT,
    "metadata" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_seguridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_seguridad_tipo_creado_en_idx" ON "eventos_seguridad"("tipo", "creado_en");

-- CreateIndex
CREATE INDEX "eventos_seguridad_orden_id_idx" ON "eventos_seguridad"("orden_id");
