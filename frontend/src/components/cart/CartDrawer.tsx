"use client";

import Image from "next/image";
import Link from "next/link";
import { X, ShoppingCart, Trash2, ShoppingBag, BookmarkPlus, Plus } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { AvisoMultiVendedor } from "@/components/cart/AvisoMultiVendedor";

export function CartDrawer() {
  const {
    carrito, guardados, isOpen, closeCart, actualizar, eliminar, vaciar,
    guardarParaDespues, moverAlCarrito, quitarGuardado,
  } = useCart();

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
          {(!carrito || carrito.items.length === 0) && guardados.length === 0 ? (
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
            <>
              {carrito && carrito.items.length > 0 && carrito.items.map((item) => {
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
                            title="Quitar del carrito"
                            className="p-1 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => guardarParaDespues(item.producto.id)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <BookmarkPlus className="h-3 w-3" /> Guardar para después
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Guardado para después */}
              {guardados.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Guardado para después ({guardados.length})
                  </h3>
                  <div className="space-y-2">
                    {guardados.map((g) => {
                      const noDisponible = !g.activo || g.stock < 1;
                      return (
                        <div key={g.id} className="flex gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                          <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                            {g.imagenUrl ? (
                              <Image src={g.imagenUrl} alt={g.nombre} width={56} height={56} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-slate-300" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{g.nombre}</p>
                            <p className="text-xs text-indigo-600 font-semibold mt-0.5">Bs. {g.precio}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <button
                                onClick={() => moverAlCarrito(g.id)}
                                disabled={noDisponible}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 transition-colors"
                              >
                                <Plus className="h-3 w-3" /> Mover al carrito
                              </button>
                              <button
                                onClick={() => quitarGuardado(g.id)}
                                className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
                              >
                                Quitar
                              </button>
                              {noDisponible && <span className="text-[11px] text-amber-600">No disponible</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
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
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                         rounded-xl py-3 text-sm transition-colors shadow-sm shadow-indigo-200"
            >
              Proceder al pago
            </Link>
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
