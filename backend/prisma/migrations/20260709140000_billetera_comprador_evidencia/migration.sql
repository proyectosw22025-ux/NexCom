-- CreateEnum
CREATE TYPE "TipoMovimientoCredito" AS ENUM ('REEMBOLSO', 'USO', 'RETIRO');

-- CreateTable
CREATE TABLE "movimientos_credito" (
    "id"           TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "tipo"         "TipoMovimientoCredito" NOT NULL,
    "monto"        DECIMAL(12,4) NOT NULL,
    "orden_id"     TEXT,
    "descripcion"  TEXT,
    "creado_en"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_credito_comprador_id_creado_en_idx" ON "movimientos_credito"("comprador_id", "creado_en");
CREATE INDEX "movimientos_credito_orden_id_tipo_idx" ON "movimientos_credito"("orden_id", "tipo");

-- AddForeignKey
ALTER TABLE "movimientos_credito"
  ADD CONSTRAINT "movimientos_credito_comprador_id_fkey"
  FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: evidencia en devoluciones
ALTER TABLE "devoluciones"
  ADD COLUMN "tipo_problema"  TEXT,
  ADD COLUMN "evidencia_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
