-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN     "costo_envio" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "metodo_entrega" TEXT NOT NULL DEFAULT 'domicilio';

