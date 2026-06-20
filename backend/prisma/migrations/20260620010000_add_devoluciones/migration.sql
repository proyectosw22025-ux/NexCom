-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('SOLICITADA', 'RECHAZADA', 'REEMBOLSADA');

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'SOLICITADA',
    "monto_reembolso" DECIMAL(12,4) NOT NULL,
    "respuesta_vendedor" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devoluciones_orden_id_key" ON "devoluciones"("orden_id");

-- CreateIndex
CREATE INDEX "devoluciones_comprador_id_estado_idx" ON "devoluciones"("comprador_id", "estado");

-- CreateIndex
CREATE INDEX "devoluciones_vendedor_id_estado_idx" ON "devoluciones"("vendedor_id", "estado");

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

