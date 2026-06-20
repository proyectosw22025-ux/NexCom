-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nit_comprador" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "importe_total" DECIMAL(12,4) NOT NULL,
    "iva" DECIMAL(12,4) NOT NULL,
    "codigo_control" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facturas_orden_id_key" ON "facturas"("orden_id");

-- CreateIndex
CREATE INDEX "facturas_comprador_id_fecha_emision_idx" ON "facturas"("comprador_id", "fecha_emision");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_vendedor_id_numero_key" ON "facturas"("vendedor_id", "numero");

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "perfiles_vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

