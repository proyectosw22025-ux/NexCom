-- CreateTable: retiro de la billetera del comprador a su banco
CREATE TABLE "retiros_credito" (
    "id"            TEXT NOT NULL,
    "comprador_id"  TEXT NOT NULL,
    "monto"         DECIMAL(12,4) NOT NULL,
    "estado"        "EstadoRetiro" NOT NULL DEFAULT 'PENDIENTE',
    "banco"         TEXT NOT NULL,
    "numero_cuenta" TEXT NOT NULL,
    "titular"       TEXT NOT NULL,
    "nota_admin"    TEXT,
    "creado_en"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_en"   TIMESTAMP(3),

    CONSTRAINT "retiros_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retiros_credito_comprador_id_estado_idx" ON "retiros_credito"("comprador_id", "estado");
CREATE INDEX "retiros_credito_estado_creado_en_idx" ON "retiros_credito"("estado", "creado_en");

-- AddForeignKey
ALTER TABLE "retiros_credito"
  ADD CONSTRAINT "retiros_credito_comprador_id_fkey"
  FOREIGN KEY ("comprador_id") REFERENCES "perfiles_comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
