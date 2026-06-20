-- CreateEnum
CREATE TYPE "TipoMovimientoPuntos" AS ENUM ('GANADOS', 'CANJEADOS');

-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN     "descuento_puntos" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "puntos_usados" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "movimientos_puntos" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "tipo" "TipoMovimientoPuntos" NOT NULL,
    "puntos" INTEGER NOT NULL,
    "orden_id" TEXT,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_puntos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_puntos_comprador_id_creado_en_idx" ON "movimientos_puntos"("comprador_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimientos_puntos_orden_id_tipo_idx" ON "movimientos_puntos"("orden_id", "tipo");

-- AddForeignKey
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

