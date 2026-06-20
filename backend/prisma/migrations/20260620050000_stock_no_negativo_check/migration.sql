-- Defensa en profundidad contra sobreventa: el stock nunca puede ser negativo.
-- (La correctitud principal está en el UPDATE condicional WHERE stock >= cantidad;
--  este CHECK es una garantía dura a nivel de base de datos.)
ALTER TABLE "productos" ADD CONSTRAINT "productos_stock_no_negativo" CHECK ("stock" >= 0);
