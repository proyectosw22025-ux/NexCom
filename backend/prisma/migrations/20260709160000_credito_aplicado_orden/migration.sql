-- AlterTable: crédito de la billetera aplicado como medio de pago en la orden
ALTER TABLE "ordenes"
  ADD COLUMN "credito_aplicado" DECIMAL(12,4) NOT NULL DEFAULT 0;
