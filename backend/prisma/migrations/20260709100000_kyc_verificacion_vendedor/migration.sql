-- CreateEnum
CREATE TYPE "EstadoVerificacion" AS ENUM ('NO_ENVIADO', 'PENDIENTE', 'APROBADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "perfiles_vendedor"
  ADD COLUMN "estado_verificacion"    "EstadoVerificacion" NOT NULL DEFAULT 'NO_ENVIADO',
  ADD COLUMN "documento_url"          TEXT,
  ADD COLUMN "documento_tipo"         TEXT,
  ADD COLUMN "verificacion_enviada_en" TIMESTAMP(3),
  ADD COLUMN "verificacion_notas"     TEXT;

-- Backfill: los vendedores ya verificados a mano quedan como APROBADO
UPDATE "perfiles_vendedor" SET "estado_verificacion" = 'APROBADO' WHERE "verificado" = true;
