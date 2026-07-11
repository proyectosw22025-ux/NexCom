-- Renombra el valor del enum de rol COMPRADOR -> CLIENTE.
-- ALTER TYPE ... RENAME VALUE preserva TODAS las filas existentes (los usuarios
-- con rol 'COMPRADOR' pasan a 'CLIENTE' sin perder datos) y actualiza el DEFAULT
-- de la columna automáticamente. No renombra tablas/columnas internas
-- (PerfilComprador, compradorId se mantienen).
ALTER TYPE "Rol" RENAME VALUE 'COMPRADOR' TO 'CLIENTE';
