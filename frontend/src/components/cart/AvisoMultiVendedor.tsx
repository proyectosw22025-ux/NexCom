import { Store } from "lucide-react";
import type { ItemCarrito } from "@/context/cart-context";

/** Cuenta vendedores distintos en el carrito (por id, con fallback a nombre). */
export function contarVendedores(items: ItemCarrito[]): number {
  const ids = new Set(items.map((it) => it.producto.vendedor?.id ?? it.producto.vendedor?.nombreNegocio ?? "?"));
  return ids.size;
}

/**
 * Aviso de que el carrito tiene productos de varias tiendas y, al pagar, se
 * dividirá en un pedido por vendedor (coherente con el split de órdenes).
 */
export function AvisoMultiVendedor({ items }: { items: ItemCarrito[] }) {
  const n = contarVendedores(items);
  if (n < 2) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        <Store className="h-4 w-4 text-amber-600" />
      </div>
      <p className="text-xs text-amber-800 leading-relaxed">
        Tu carrito tiene productos de <strong>{n} tiendas</strong>. Al pagar se generará un{" "}
        <strong>pedido separado por cada tienda</strong>, pero realizas un solo pago.
      </p>
    </div>
  );
}
