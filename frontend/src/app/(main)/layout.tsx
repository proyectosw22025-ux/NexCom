"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart, Menu, X, Store, LogIn, LogOut,
  User, ChevronDown, Boxes, Heart, LayoutDashboard, MessageCircle,
  Package, ShoppingBag,
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
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); setUserMenuOpen(false); }, [pathname]);

  // Cerrar el menú de usuario al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setUserMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [userMenuOpen]);

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
              aria-label={`Carrito${(carrito?.totalItems ?? 0) > 0 ? `, ${carrito!.totalItems} artículos` : ""}`}
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

          {/* Mensajes */}
          {user && (
            <Link href="/mensajes" aria-label="Mensajes" className="p-2 rounded-xl hover:bg-slate-100 transition-colors" title="Mensajes">
              <MessageCircle className="h-5 w-5 text-slate-700" />
            </Link>
          )}

          {/* Notificaciones */}
          {user && <NotificationBell accent="indigo" />}

          {/* User menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Menú de usuario"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-sm"
              >
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <span className="hidden sm:inline font-medium text-slate-700 max-w-[100px] truncate">
                  {user.perfilVendedor?.nombreNegocio ?? user.perfilComprador?.nombreCompleto ?? user.email}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div role="menu" className="animate-scale-in origin-top-right absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/60 py-1.5 z-50">
                  {/* Cabecera: identidad */}
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user.perfilVendedor?.nombreNegocio ?? user.perfilComprador?.nombreCompleto ?? "Mi cuenta"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    {user.rol === "COMPRADOR" && (
                      <>
                        <Link href="/comprador" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <LayoutDashboard className="h-4 w-4 text-slate-400" /> Mi Panel
                        </Link>
                        <Link href="/comprador/ordenes" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <Package className="h-4 w-4 text-slate-400" /> Mis Pedidos
                        </Link>
                        <Link href="/favoritos" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <Heart className="h-4 w-4 text-slate-400" /> Favoritos
                        </Link>
                        <Link href="/comprador/perfil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <User className="h-4 w-4 text-slate-400" /> Mi Perfil
                        </Link>
                        <Link href="/productos" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <ShoppingBag className="h-4 w-4 text-slate-400" /> Seguir comprando
                        </Link>
                      </>
                    )}
                    {user.rol === "VENDEDOR" && (
                      <Link href="/vendedor" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <Store className="h-4 w-4 text-slate-400" /> Mi Tienda
                      </Link>
                    )}
                    {user.rol === "ADMIN" && (
                      <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <LayoutDashboard className="h-4 w-4 text-slate-400" /> Panel admin
                      </Link>
                    )}
                  </div>

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
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
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
        {/* Saltar al contenido: visible solo al enfocarlo con teclado (a11y) */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2
                     focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold"
        >
          Saltar al contenido
        </a>
        <NavbarInner />
        <CartDrawer />
        <main id="contenido" className="flex-1">{children}</main>
        <footer className="bg-white border-t border-slate-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <Boxes className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-700">NexCom</span>
            </div>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} NexCom Bolivia · Marketplace local para microempresas</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
