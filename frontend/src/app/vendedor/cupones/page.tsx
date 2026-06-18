"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { Ticket, Loader2, Plus, Percent, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MIS_CUPONES } from "@/graphql/cupones/queries";
import { CREAR_CUPON } from "@/graphql/cupones/mutations";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

interface Cupon {
  id: string; codigo: string; tipo: string; valor: string; montoMinimo: string | null;
  maxUsos: number | null; usosActuales: number; fechaInicio: string; fechaFin: string; activo: boolean;
}

const TIPO_OPCIONES = [
  { value: "PORCENTAJE", label: "Porcentaje (%)" },
  { value: "MONTO_FIJO", label: "Monto fijo (Bs.)" },
];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const FORM_INICIAL = {
  codigo: "", tipo: "PORCENTAJE", valor: "", montoMinimo: "", maxUsos: "",
  fechaInicio: "", fechaFin: "",
};

export default function VendedorCuponesPage() {
  const { data, loading, refetch } = useQuery<{ misCupones: Cupon[] }>(MIS_CUPONES, {
    fetchPolicy: "cache-and-network",
  });
  const [crearCupon, { loading: creando }] = useMutation(CREAR_CUPON);
  const [form, setForm] = useState(FORM_INICIAL);

  const cupones = data?.misCupones ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo.trim() || !form.valor || !form.fechaInicio || !form.fechaFin) {
      toast.error("Completa código, valor y fechas.");
      return;
    }
    try {
      await crearCupon({
        variables: {
          input: {
            codigo:      form.codigo.trim().toUpperCase(),
            tipo:        form.tipo,
            valor:       parseFloat(form.valor),
            montoMinimo: form.montoMinimo ? parseFloat(form.montoMinimo) : null,
            maxUsos:     form.maxUsos ? parseInt(form.maxUsos, 10) : null,
            fechaInicio: form.fechaInicio,
            fechaFin:    form.fechaFin,
          },
        },
      });
      toast.success("Cupón creado.");
      setForm(FORM_INICIAL);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Ticket className="h-6 w-6 text-violet-600" /> Cupones de mi tienda
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Los cupones que crees aplican solo a compras de tus productos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-violet-500" /> Nuevo cupón
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Código *</label>
            <input
              value={form.codigo}
              onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
              placeholder="VERANO20"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Tipo *</label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}
                options={TIPO_OPCIONES}
                icon={form.tipo === "PORCENTAJE" ? Percent : DollarSign}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Valor * {form.tipo === "PORCENTAJE" ? "(%)" : "(Bs.)"}
              </label>
              <input
                type="number" min={0} step="0.01"
                value={form.valor}
                onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                placeholder={form.tipo === "PORCENTAJE" ? "20" : "50"}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Monto mínimo</label>
              <input
                type="number" min={0} step="0.01"
                value={form.montoMinimo}
                onChange={(e) => setForm((p) => ({ ...p, montoMinimo: e.target.value }))}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Máx. usos</label>
              <input
                type="number" min={1} step="1"
                value={form.maxUsos}
                onChange={(e) => setForm((p) => ({ ...p, maxUsos: e.target.value }))}
                placeholder="Ilimitado"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Inicio *</label>
            <DateTimePicker value={form.fechaInicio} onChange={(v) => setForm((p) => ({ ...p, fechaInicio: v }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Fin *</label>
            <DateTimePicker value={form.fechaFin} onChange={(v) => setForm((p) => ({ ...p, fechaFin: v }))} min={form.fechaInicio} />
          </div>

          <button
            type="submit"
            disabled={creando}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700
                       disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors
                       shadow-sm shadow-violet-200"
          >
            {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear cupón
          </button>
        </form>

        {/* Listado */}
        <div className="lg:col-span-3">
          {loading && !data ? (
            <div className="flex items-center justify-center py-20 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <p className="text-sm text-slate-400">Cargando cupones…</p>
            </div>
          ) : cupones.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
              <Ticket className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Aún no has creado cupones</p>
              <p className="text-sm text-slate-400 mt-1">Crea tu primer cupón para impulsar tus ventas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cupones.map((c) => {
                const vigente = c.activo && new Date(c.fechaFin) > new Date();
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      {c.tipo === "PORCENTAJE"
                        ? <Percent className="h-5 w-5 text-violet-600" />
                        : <DollarSign className="h-5 w-5 text-violet-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-slate-900">{c.codigo}</p>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${vigente ? "text-emerald-600" : "text-slate-400"}`}>
                          {vigente ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {vigente ? "Vigente" : "Expirado"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.tipo === "PORCENTAJE" ? `${c.valor}% de descuento` : `Bs. ${c.valor} de descuento`}
                        {c.montoMinimo && ` · mín. Bs. ${c.montoMinimo}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatFecha(c.fechaInicio)} – {formatFecha(c.fechaFin)} · usos: {c.usosActuales}{c.maxUsos ? `/${c.maxUsos}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
