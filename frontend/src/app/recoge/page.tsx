"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { QrCode, Wallet, LogIn, ArrowRight, Package, ShieldCheck } from "lucide-react";

export default function RecogeHome() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <QrCode className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Recoge NexCom</h1>
          <p className="text-sm text-slate-500 mt-1">Inicia sesión para recoger pedidos y ver tu saldo.</p>
          <Link href="/login"
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const nombre =
    user.perfilVendedor?.nombreNegocio ??
    user.perfilComprador?.nombreCompleto ??
    user.email;

  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-xs text-slate-400">Hola,</p>
        <h1 className="text-xl font-bold text-slate-900">{nombre} 👋</h1>
      </div>

      {/* Acción principal: escanear para recoger */}
      <Link href="/recoge/escanear"
        className="block rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <QrCode className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold">Escanear pedido</p>
            <p className="text-xs text-indigo-100">Confirma la recepción escaneando el QR del paquete</p>
          </div>
          <ArrowRight className="h-5 w-5 text-indigo-100" />
        </div>
      </Link>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/recoge/saldo" className="rounded-2xl bg-white border border-slate-200 p-4">
          <Wallet className="h-5 w-5 text-indigo-600 mb-2" />
          <p className="text-sm font-semibold text-slate-900">
            {user.rol === "VENDEDOR" ? "Mi saldo" : "Mi billetera"}
          </p>
          <p className="text-xs text-slate-400">Ver disponible y movimientos</p>
        </Link>
        <Link href={user.rol === "VENDEDOR" ? "/vendedor/ordenes" : "/comprador/ordenes"}
          className="rounded-2xl bg-white border border-slate-200 p-4">
          <Package className="h-5 w-5 text-violet-600 mb-2" />
          <p className="text-sm font-semibold text-slate-900">Mis pedidos</p>
          <p className="text-xs text-slate-400">Ver el detalle completo</p>
        </Link>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
        <ShieldCheck className="h-3.5 w-3.5" /> Puedes instalar esta app desde el menú de tu navegador (&quot;Añadir a inicio&quot;).
      </p>
    </div>
  );
}
