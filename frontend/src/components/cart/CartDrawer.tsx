"use client";

import Image from "next/image";
import Link from "next/link";
import { X, ShoppingCart, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { AvisoMultiVendedor } from "@/components/cart/AvisoMultiVendedor";

export function CartDrawer() {
  const { carrito, isOpen, closeCart, actualizar, eliminar, vaciar } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-fade-in-backdrop"
        onClick={closeCart}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-slide-from-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Mi Carrito</h2>
            {(carrito?.totalItems ?? 0) > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {carrito!.totalItems}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!carrito || carrito.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Tu carrito está vacío</p>
                <p className="text-sm text-slate-400 mt-1">Agrega productos para empezar</p>
              </div>
              <Link
                href="/productos"
                onClick={closeCart}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600
                           hover:text-indigo-700 transition-colors"
              >
                Explorar productos →
              </Link>
            </div>
          ) : (
            carrito.items.map((item) => {
              const img = item.producto.imagenes?.[0]?.url;
              return (
                <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0">
                    {img ? (
                      <Image src={img} alt={item.producto.nombre} width={64} height={64}
                             className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.producto.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Bs. {item.precioSnapshot} c/u</p>
                    <div className="flex items-center justify-between mt-2">
                      <QuantityStepper
                        value={item.cantidad}
                        max={item.producto.stock}
                        onDecrement={() => item.cantidad > 1
                          ? actualizar(item.producto.id, item.cantidad - 1)
                          : eliminar(item.producto.id)}
                        onIncrement={() => actualizar(item.producto.id, item.cantidad + 1)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">Bs. {item.subtotal}</span>
                        <button
                          onClick={() => eliminar(item.producto.id)}
                          className="p-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {carrito && carrito.items.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-3">
            <AvisoMultiVendedor items={carrito.items} />
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-bold text-slate-900">Bs. {carrito.total}</span>
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                               rounded-xl py-3 text-sm transition-colors shadow-sm shadow-indigo-200">
              Proceder al pago
            </button>
            <button
              onClick={vaciar}
              className="w-full text-slate-500 text-xs hover:text-red-500 transition-colors py-1"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
