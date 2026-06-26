-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN     "disputa_abierta" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "disputas" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "evidencia_url" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "resolucion_nota" TEXT,
    "resuelto_por_id" TEXT,
    "resuelto_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disputas_orden_id_key" ON "disputas"("orden_id");

-- CreateIndex
CREATE INDEX "disputas_estado_creado_en_idx" ON "disputas"("estado", "creado_en");

-- CreateIndex
CREATE INDEX "disputas_comprador_id_idx" ON "disputas"("comprador_id");

-- AddForeignKey
ALTER TABLE "disputas" ADD CONSTRAINT "disputas_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
