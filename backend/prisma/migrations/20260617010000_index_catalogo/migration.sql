-- DropIndex
DROP INDEX "productos_activo_destacado_idx";

-- CreateIndex
CREATE INDEX "productos_activo_destacado_creado_en_idx" ON "productos"("activo", "destacado", "creado_en");

