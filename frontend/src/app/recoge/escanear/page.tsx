"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { QrCode, Loader2, Package, LogIn, ArrowLeft, Store } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { MIS_ORDENES } from "@/graphql/ordenes/queries";
import { RecogerPedido } from "@/components/ordenes/RecogerPedido";

interface Orden {
  id: string; estado: string; total: string;
  items: { id: string; nombreSnapshot: string; cantidad: number }[];
}

export default function RecogeEscanear() {
  const { user, isLoading } = useAuth();
  const esComprador = user?.rol === "COMPRADOR";
  const { data, loading, refetch } = useQuery<{ misOrdenes: Orden[] }>(MIS_ORDENES, {
    fetchPolicy: "cache-and-network", skip: !esComprador,
  });
  const [activa, setActiva] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando…</div>;
  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500 mb-3">Inicia sesión para recoger tus pedidos.</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">
          <LogIn className="h-4 w-4" /> Iniciar sesión
        </Link>
      </div>
    );
  }

  // El escaneo de recojo es una acción del comprador (confirma la recepción).
  if (!esComprador) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
          <Store className="h-6 w-6 text-violet-600" />
        </div>
        <p className="text-sm text-slate-600">El escaneo de recojo lo hace el comprador al recibir el paquete.</p>
        <Link href="/vendedor/ordenes" className="mt-3 inline-block text-xs text-indigo-600 font-semibold">Ver mis órdenes →</Link>
      </div>
    );
  }

  const porRecoger = (data?.misOrdenes ?? []).filter((o) => o.estado === "ENVIADO");

  // Vista de escaneo de una orden concreta
  if (activa) {
    return (
      <div className="p-5">
        <button onClick={() => { setActiva(null); refetch(); }} className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <RecogerPedido ordenId={activa} onEntregado={() => { setActiva(null); refetch(); }} />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <QrCode className="h-5 w-5 text-indigo-600" /> Recoger pedido
      </h1>
      <p className="text-sm text-slate-500">Selecciona el pedido que vas a recibir y escanea el QR del paquete.</p>

      {loading && !data ? (
        <div className="flex items-center gap-2 py-10 justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">Cargando…</span>
        </div>
      ) : porRecoger.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No tienes pedidos en camino por recoger.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {porRecoger.map((o) => (
            <button key={o.id} onClick={() => setActiva(o.id)}
              className="w-full text-left rounded-2xl bg-white border border-slate-200 p-4 hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Orden #{o.id.slice(-8).toUpperCase()}</p>
                <span className="text-sm font-bold text-slate-900">Bs. {o.total}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {o.items[0]?.nombreSnapshot}{o.items.length > 1 ? ` +${o.items.length - 1} más` : ""}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mt-2">
                <QrCode className="h-3.5 w-3.5" /> Escanear para confirmar
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
