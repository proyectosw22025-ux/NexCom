"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { Wallet, Loader2, LogIn, WifiOff } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MI_SALDO } from "@/graphql/saldos";
import { MI_BILLETERA } from "@/graphql/credito";

export default function RecogeSaldo() {
  const { user, isLoading } = useAuth();
  const online = useOnlineStatus();
  const esVendedor = user?.rol === "VENDEDOR";

  const { data: saldoData, loading: lS } = useQuery(MI_SALDO, {
    fetchPolicy: "cache-and-network", skip: !esVendedor,
  });
  const { data: billData, loading: lB } = useQuery(MI_BILLETERA, {
    fetchPolicy: "cache-and-network", skip: esVendedor || !user,
  });

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando…</div>;
  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500 mb-3">Inicia sesión para ver tu saldo.</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">
          <LogIn className="h-4 w-4" /> Iniciar sesión
        </Link>
      </div>
    );
  }

  const loading = esVendedor ? lS : lB;
  const saldo = saldoData?.miSaldo;
  const bill  = billData?.miBilletera;

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-indigo-600" /> {esVendedor ? "Mi saldo" : "Mi billetera"}
      </h1>

      {!online && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <WifiOff className="h-4 w-4 shrink-0" />
          Sin conexión — mostrando los últimos datos guardados.
        </div>
      )}

      {loading && !saldo && !bill ? (
        <div className="flex items-center gap-2 py-10 justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">Cargando…</span>
        </div>
      ) : esVendedor ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5">
            <p className="text-xs uppercase tracking-wide text-indigo-100">Disponible para retirar</p>
            <p className="text-3xl font-extrabold mt-1">Bs. {saldo?.retirable ?? "0.00"}</p>
            {Number(saldo?.enAsentamiento ?? "0") > 0 && (
              <p className="text-[11px] text-indigo-100 mt-1.5">+ Bs. {saldo?.enAsentamiento} en asentamiento</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-xs text-slate-400">En garantía</p>
              <p className="text-lg font-bold text-slate-900">Bs. {saldo?.retenido ?? "0.00"}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-xs text-slate-400">Generado</p>
              <p className="text-lg font-bold text-slate-900">Bs. {saldo?.generado ?? "0.00"}</p>
            </div>
          </div>
          <Link href="/vendedor/saldo" className="block text-center text-xs text-indigo-600 font-semibold py-2">
            Ver detalle y retirar →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5">
            <p className="text-xs uppercase tracking-wide text-indigo-100">Saldo disponible</p>
            <p className="text-3xl font-extrabold mt-1">Bs. {bill?.disponible ?? "0.00"}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-50">
            {(bill?.movimientos ?? []).slice(0, 6).map((m: { id: string; descripcion: string | null; monto: string; tipo: string; creadoEn: string }) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-slate-600 truncate">{m.descripcion ?? m.tipo}</p>
                <span className={`text-sm font-bold shrink-0 ${m.tipo === "REEMBOLSO" ? "text-emerald-600" : "text-slate-600"}`}>
                  {m.tipo === "REEMBOLSO" ? "+" : "−"} Bs. {m.monto}
                </span>
              </div>
            ))}
            {(bill?.movimientos ?? []).length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">Aún no tienes movimientos.</p>
            )}
          </div>
          <Link href="/comprador/saldo" className="block text-center text-xs text-indigo-600 font-semibold py-2">
            Ver billetera completa →
          </Link>
        </div>
      )}
    </div>
  );
}
