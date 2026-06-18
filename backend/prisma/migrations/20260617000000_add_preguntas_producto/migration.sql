-- CreateTable
CREATE TABLE "preguntas_producto" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT,
    "respondido_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_producto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preguntas_producto_producto_id_creado_en_idx" ON "preguntas_producto"("producto_id", "creado_en");

-- AddForeignKey
ALTER TABLE "preguntas_producto" ADD CONSTRAINT "preguntas_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas_producto" ADD CONSTRAINT "preguntas_producto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

