"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ShoppingCart, Menu, X, Store, LogIn, LogOut,
  User, ChevronDown, Boxes, Heart, LayoutDashboard,
} from "lucide-react";
import { CartProvider, useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SearchBar } from "@/components/busqueda/SearchBar";
import { NotificationBell } from "@/components/notificaciones/NotificationBell";

function NavbarInner() {
  const { user, logout } = useAuth();
  const { carrito, openCart } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
            <Boxes className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-lg hidden sm:inline tracking-tight">
            Nex<span className="text-indigo-600">Com</span>
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-auto hidden md:flex">
          <SearchBar />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Cart */}
          {user?.rol === "COMPRADOR" && (
            <button
              onClick={openCart}
              className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-slate-700" />
              {(carrito?.totalItems ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                                 bg-indigo-600 text-white text-[10px] font-bold rounded-full
                                 flex items-center justify-center">
                  {carrito!.totalItems > 99 ? "99+" : carrito!.totalItems}
                </span>
              )}
            </button>
          )}

          {/* Notificaciones */}
          {user && <NotificationBell accent="indigo" />}

          {/* User menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-sm"
              >
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <span className="hidden sm:inline font-medium text-slate-700 max-w-[100px] truncate">
                  {user.perfilVendedor?.nombreNegocio ?? user.perfilComprador?.nombreCompleto ?? user.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/60 py-1.5 z-50">
                  {user.rol === "VENDEDOR" && (
                    <Link href="/vendedor" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <Store className="h-4 w-4 text-slate-400" /> Mi Tienda
                    </Link>
                  )}
                  {user.rol === "ADMIN" && (
                    <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <LayoutDashboard className="h-4 w-4 text-slate-400" /> Admin
                    </Link>
                  )}
                  {user.rol === "COMPRADOR" && (
                    <Link href="/favoritos" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <Heart className="h-4 w-4 text-slate-400" /> Favoritos
                    </Link>
                  )}
                  <hr className="my-1 border-slate-100" />
                  <button
                    onClick={async () => { setUserMenuOpen(false); await logout(); window.location.href = "/"; }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                         text-white text-sm font-semibold rounded-xl transition-colors
                         shadow-sm shadow-indigo-200"
            >
              <LogIn className="h-4 w-4" />
              <span>Ingresar</span>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-3 border-t border-slate-100 pt-3">
          <SearchBar />
        </div>
      )}
    </header>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavbarInner />
        <CartDrawer />
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-slate-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <Boxes className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-700">NexCom</span>
            </div>
            <p className="text-xs text-slate-400">© 2025 NexCom Bolivia · Marketplace local para microempresas</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
