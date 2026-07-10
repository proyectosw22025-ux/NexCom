"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { Wallet, Loader2, ArrowDownCircle, ArrowUpCircle, TrendingUp, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { MI_SALDO, SOLICITAR_RETIRO } from "@/graphql/saldos";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useAuth } from "@/context/auth-context";

interface Saldo { disponible: string; retirable: string; enAsentamiento: string; retenido: string; generado: string; enRevision: string; retirado: string; comisionTotal: string }
interface Movimiento { id: string; tipo: string; monto: string; comision: string; ordenIdCorto: string | null; descripcion: string; creadoEn: string }
interface Retiro { id: string; monto: string; estado: string; banco: string; numeroCuenta: string; titular: string; notaAdmin: string | null; creadoEn: string }

const RETIRO_UI: Record<string, { color: string; label: string }> = {
  PENDIENTE: { color: "text-amber-600",   label: "En revisión" },
  PAGADO:    { color: "text-emerald-600", label: "Pagado" },
  RECHAZADO: { color: "text-red-600",     label: "Rechazado" },
};

export default function VendedorSaldoPage() {
  const { data, loading } = useQuery<{ miSaldo: Saldo; misMovimientos: Movimiento[]; misRetiros: Retiro[] }>(
    MI_SALDO, { fetchPolicy: "cache-and-network" },
  );
  const [solicitar, { loading: enviando }] = useMutation(SOLICITAR_RETIRO);
  const [form, setForm] = useState({ monto: "", banco: "", numeroCuenta: "", titular: "" });
  const { user } = useAuth();
  const verificado = user?.perfilVendedor?.verificado ?? true; // hasta saberlo, no alarmar

  const saldo = data?.miSaldo;
  const movimientos = data?.misMovimientos ?? [];
  const retiros = data?.misRetiros ?? [];

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await solicitar({ variables: form, refetchQueries: [{ query: MI_SALDO }] });
      toast.success("Solicitud de retiro enviada.");
      setForm({ monto: "", banco: "", numeroCuenta: "", titular: "" });
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  if (loading && !data) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-600" /> Mi saldo
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Tus ganancias netas tras la comisión de la plataforma</p>
      </div>

      {/* KYC: aviso si la cuenta aún no está verificada para retirar */}
      {!verificado && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Verificación pendiente</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Tu tienda aún no está verificada por la plataforma. Podrás solicitar retiros una vez que el equipo
              verifique tu cuenta (KYC). Tus ventas se siguen acreditando normalmente.
            </p>
          </div>
        </div>
      )}

      {/* Saldo destacado */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Disponible para retirar</p>
          <p className="text-3xl font-extrabold mt-2">Bs. {saldo?.retirable ?? "0.00"}</p>
          {Number(saldo?.enAsentamiento ?? "0") > 0 && (
            <p className="text-xs text-indigo-100 mt-1.5">
              + Bs. {saldo?.enAsentamiento} en asentamiento (se libera al pasar la ventana de devolución de 7 días)
            </p>
          )}
        </div>
        <div className="surface-emerald rounded-2xl border border-emerald-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> En garantía
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">Bs. {saldo?.retenido ?? "0.00"}</p>
          <p className="text-xs text-slate-400 mt-1">Se libera al confirmarse la entrega</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En revisión</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">Bs. {saldo?.enRevision ?? "0.00"}</p>
          <p className="text-xs text-slate-400 mt-1">Retirado: Bs. {saldo?.retirado ?? "0.00"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generado (histórico)</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">Bs. {saldo?.generado ?? "0.00"}</p>
          <p className="text-xs text-slate-400 mt-1">Comisión pagada: Bs. {saldo?.comisionTotal ?? "0.00"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Solicitar retiro */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Solicitar retiro</h2>
            <form onSubmit={handleSolicitar} className="space-y-3">
              <div>
                <input
                  type="number" min={0} step="0.01" inputMode="decimal" required
                  max={saldo?.retirable}
                  value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                  placeholder="Monto (Bs.)"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">Retirable: Bs. {saldo?.retirable ?? "0.00"} (mínimo Bs. 50)</p>
              </div>
              <input
                required value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                placeholder="Banco (ej. Banco Unión)"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <input
                required value={form.numeroCuenta} onChange={(e) => setForm((f) => ({ ...f, numeroCuenta: e.target.value }))}
                placeholder="Número de cuenta"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <input
                required value={form.titular} onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))}
                placeholder="Titular de la cuenta"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <button
                type="submit" disabled={enviando}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Solicitar retiro
              </button>
              <p className="text-[11px] text-slate-400 text-center">Retiro mínimo: Bs. 50.00</p>
            </form>
          </div>

          {/* Historial de retiros */}
          {retiros.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Mis retiros</h2>
              <ul className="space-y-2">
                {retiros.map((r) => {
                  const ui = RETIRO_UI[r.estado] ?? RETIRO_UI.PENDIENTE;
                  return (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">Bs. {r.monto}</p>
                        <p className="text-xs text-slate-400">{r.banco} · {formatRelativeTime(r.creadoEn)}</p>
                      </div>
                      <span className={`text-xs font-semibold ${ui.color}`}>{ui.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Movimientos */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Movimientos recientes</h2>
            </div>
            {movimientos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Aún no tienes movimientos</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {movimientos.map((m) => {
                  const esDebito   = m.tipo === "REEMBOLSO";
                  const esRetenido = m.tipo === "RETENCION";
                  const conComision = (m.tipo === "VENTA" || m.tipo === "RETENCION") && parseFloat(m.comision) > 0;
                  const chip = esDebito ? "bg-red-50" : esRetenido ? "bg-amber-50" : "bg-emerald-50";
                  const monto = esDebito ? "text-red-600" : esRetenido ? "text-amber-600" : "text-emerald-600";
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${chip}`}>
                        {esDebito
                          ? <ArrowUpCircle className="h-4 w-4 text-red-500" />
                          : esRetenido
                            ? <ShieldCheck className="h-4 w-4 text-amber-500" />
                            : <ArrowDownCircle className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{m.descripcion}</p>
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(m.creadoEn)}
                          {esRetenido ? " · en garantía" : ""}
                          {conComision ? ` · comisión Bs. ${m.comision}` : ""}
                        </p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${monto}`}>
                        {esDebito ? "−" : "+"}Bs. {m.monto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
