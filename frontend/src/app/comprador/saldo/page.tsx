"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import Link from "next/link";
import { Wallet, Loader2, ArrowDownLeft, ArrowUpRight, Banknote, Info, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MI_BILLETERA, MIS_RETIROS_CREDITO, SOLICITAR_RETIRO_CREDITO } from "@/graphql/credito";

interface Movimiento {
  id: string; tipo: string; monto: string; ordenId: string | null; descripcion: string | null; creadoEn: string;
}
interface Billetera { disponible: string; movimientos: Movimiento[] }
interface Retiro {
  id: string; monto: string; estado: string; banco: string; numeroCuenta: string;
  titular: string; notaAdmin: string | null; creadoEn: string; resueltoEn: string | null;
}

const TIPO_UI: Record<string, { label: string; icon: typeof ArrowDownLeft; color: string; signo: string }> = {
  REEMBOLSO: { label: "Reembolso recibido", icon: ArrowDownLeft, color: "text-emerald-600", signo: "+" },
  USO:       { label: "Usado en compra",    icon: ArrowUpRight,  color: "text-slate-500",   signo: "−" },
  RETIRO:    { label: "Retiro a banco",     icon: Banknote,      color: "text-slate-500",   signo: "−" },
};
const RETIRO_UI: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  PENDIENTE: { label: "En proceso", icon: Clock,        color: "text-amber-600" },
  PAGADO:    { label: "Pagado",     icon: CheckCircle2, color: "text-emerald-600" },
  RECHAZADO: { label: "Rechazado",  icon: XCircle,      color: "text-red-600" },
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const FORM_INICIAL = { monto: "", banco: "", numeroCuenta: "", titular: "" };

export default function CompradorSaldoPage() {
  const { data, loading, refetch } = useQuery<{ miBilletera: Billetera }>(MI_BILLETERA, { fetchPolicy: "cache-and-network" });
  const { data: retData, refetch: refetchRet } = useQuery<{ misRetirosCredito: Retiro[] }>(MIS_RETIROS_CREDITO, { fetchPolicy: "cache-and-network" });
  const [solicitar, { loading: enviando }] = useMutation(SOLICITAR_RETIRO_CREDITO);

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const b = data?.miBilletera;
  const retiros = retData?.misRetirosCredito ?? [];
  const disponible = Number(b?.disponible ?? "0");

  async function handleRetirar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await solicitar({ variables: { input: {
        monto: form.monto, banco: form.banco.trim(), numeroCuenta: form.numeroCuenta.trim(), titular: form.titular.trim(),
      } } });
      toast.success("Solicitud de retiro enviada. Te avisaremos cuando se procese.");
      setForm(FORM_INICIAL); setAbierto(false);
      refetch(); refetchRet();
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-600" /> Mi billetera
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">El dinero de tus devoluciones: úsalo en compras o retíralo a tu banco.</p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Saldo + acciones */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Saldo disponible</p>
            <p className="text-4xl font-extrabold mt-1">Bs. {b?.disponible ?? "0.00"}</p>
            <div className="flex items-center gap-2 mt-4">
              <Link href="/productos" className="text-xs font-semibold bg-white/90 hover:bg-white text-indigo-700 px-3 py-2 rounded-xl transition-colors">
                Usar en compras
              </Link>
              {disponible > 0 && (
                <button
                  onClick={() => setAbierto((v) => !v)}
                  className="text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Banknote className="h-3.5 w-3.5" /> Retirar a mi banco
                </button>
              )}
            </div>
            <p className="text-xs text-indigo-100 mt-3 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> El retiro lo revisa nuestro equipo antes de pagarlo (retiro mínimo Bs. 20).
            </p>
          </div>

          {/* Formulario de retiro */}
          {abierto && (
            <form onSubmit={handleRetirar} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Retirar a mi banco</h2>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" min={20} step="0.01" required placeholder="Monto (Bs.)"
                  value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
                <input
                  required placeholder="Banco (ej. BNB)"
                  value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <input
                required placeholder="Número de cuenta"
                value={form.numeroCuenta} onChange={(e) => setForm((f) => ({ ...f, numeroCuenta: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <input
                required placeholder="Titular de la cuenta"
                value={form.titular} onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={enviando}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} Solicitar retiro
                </button>
                <button type="button" onClick={() => setAbierto(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
              </div>
            </form>
          )}

          {/* Mis retiros */}
          {retiros.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">Mis retiros</h2></div>
              <div className="divide-y divide-slate-50">
                {retiros.map((r) => {
                  const ui = RETIRO_UI[r.estado] ?? RETIRO_UI.PENDIENTE;
                  const Icono = ui.icon;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                      <Icono className={`h-4 w-4 shrink-0 ${ui.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">Bs. {r.monto} → {r.banco}</p>
                        <p className="text-xs text-slate-400">{fecha(r.creadoEn)}{r.notaAdmin ? ` · ${r.notaAdmin}` : ""}</p>
                      </div>
                      <span className={`text-xs font-semibold ${ui.color}`}>{ui.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Movimientos */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Movimientos</h2>
            </div>
            {(b?.movimientos ?? []).length === 0 ? (
              <div className="text-center py-14">
                <Wallet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Aún no tienes movimientos.</p>
                <p className="text-xs text-slate-400 mt-1">Cuando te aprueben una devolución, el dinero aparecerá aquí.</p>
                <Link href="/comprador/ordenes" className="text-xs text-indigo-600 hover:underline mt-3 inline-block">Ver mis pedidos →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(b?.movimientos ?? []).map((m) => {
                  const ui = TIPO_UI[m.tipo] ?? TIPO_UI.USO;
                  const Icono = ui.icon;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className={`w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center ${ui.color}`}>
                        <Icono className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{ui.label}</p>
                        <p className="text-xs text-slate-400 truncate">{m.descripcion ?? fecha(m.creadoEn)}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${m.tipo === "REEMBOLSO" ? "text-emerald-600" : "text-slate-600"}`}>
                        {ui.signo} Bs. {m.monto}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
