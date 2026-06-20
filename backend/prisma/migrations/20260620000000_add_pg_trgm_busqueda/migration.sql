-- Búsqueda tolerante a errores de tipeo: extensión pg_trgm + índice GIN trigram sobre el nombre.
-- IF NOT EXISTS para que sea idempotente y seguro de re-aplicar.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "productos_nombre_idx" ON "productos" USING GIN ("nombre" gin_trgm_ops);
