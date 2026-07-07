-- AlterEnum
ALTER TYPE "TipoMovimientoSaldo" ADD VALUE 'SUSCRIPCION';

-- AlterTable
ALTER TABLE "perfiles_vendedor" ADD COLUMN     "plan_vence_en" TIMESTAMP(3);
