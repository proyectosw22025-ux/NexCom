-- CreateTable
CREATE TABLE "items_guardados" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_guardados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "items_guardados_comprador_id_producto_id_key" ON "items_guardados"("comprador_id", "producto_id");

-- AddForeignKey
ALTER TABLE "items_guardados" ADD CONSTRAINT "items_guardados_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_guardados" ADD CONSTRAINT "items_guardados_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

