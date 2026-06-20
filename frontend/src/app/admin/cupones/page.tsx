"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { Ticket, Loader2, Plus, Globe, Store, Power } from "lucide-react";
import { toast } from "sonner";
import { CUPONES_ADMIN } from "@/graphql/cupones/queries";
import { CREAR_CUPON, DESACTIVAR_CUPON } from "@/graphql/cupones/mutations";

interface Cupon {
  id: string; codigo: string; tipo: string; valor: string; montoMinimo: string | null;
  maxUsos: number | null; usosActuales: number; vendedorId: string | null;
  fechaInicio: string; fechaFin: string; activo: boolean;
}

const hoy = () => new Date().toISOString().slice(0, 10);
const enUnMes = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

export default function AdminCuponesPage() {
  const { data, loading } = useQuery<{ cupones: Cupon[] }>(CUPONES_ADMIN, { fetchPolicy: "cache-and-network" });
  const [crearCupon, { loading: creando }] = useMutation(CREAR_CUPON);
  const [desactivar] = useMutation(DESACTIVAR_CUPON);
  const [form, setForm] = useState({
    codigo: "", tipo: "PORCENTAJE", valor: "", montoMinimo: "", maxUsos: "",
    fechaInicio: hoy(), fechaFin: enUnMes(),
  });

  const cupones = data?.cupones ?? [];
  const globales = cupones.filter((c) => !c.vendedorId);
  const deTienda = cupones.filter((c) => c.vendedorId);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    try {
      await crearCupon({
        variables: { input: {
          codigo: form.codigo.trim().toUpperCase(),
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          montoMinimo: form.montoMinimo ? parseFloat(form.montoMinimo) : null,
          maxUsos: form.maxUsos ? parseInt(form.maxUsos, 10) : null,
          fechaInicio: new Date(form.fechaInicio).toISOString(),
          fechaFin: new Date(form.fechaFin).toISOString(),
        } },
        refetchQueries: [{ query: CUPONES_ADMIN }],
      });
      toast.success("Cupón global creado.");
      setForm((f) => ({ ...f, codigo: "", valor: "", montoMinimo: "", maxUsos: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  async function handleDesactivar(id: string) {
    try {
      await desactivar({ variables: { id }, refetchQueries: [{ query: CUPONES_ADMIN }] });
      toast.success("Cupón desactivado.");
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400";

  function fila(c: Cupon) {
    return (
      <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.vendedorId ? "bg-violet-50" : "bg-indigo-50"}`}>
          {c.vendedorId ? <Store className="h-4 w-4 text-violet-600" /> : <Globe className="h-4 w-4 text-indigo-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 font-mono truncate">{c.codigo}</p>
          <p className="text-xs text-slate-400">
            {c.tipo === "PORCENTAJE" ? `${c.valor}% dto.` : `Bs. ${c.valor} dto.`}
            {c.montoMinimo ? ` · mín. Bs. ${c.montoMinimo}` : ""}
            {` · usos ${c.usosActuales}${c.maxUsos ? `/${c.maxUsos}` : ""}`}
          </p>
        </div>
        {c.activo ? (
          <button
            onClick={() => handleDesactivar(c.id)}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Power className="h-3.5 w-3.5" /> Desactivar
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-400 px-2.5">Inactivo</span>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Ticket className="h-6 w-6 text-indigo-600" /> Cupones
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Crea cupones globales de plataforma y gestiona los de cada tienda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Crear cupón global */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600" /> Nuevo cupón global
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <input required value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="Código (ej. NEXCOM10)" className={`${inputCls} font-mono uppercase`} />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className={inputCls}>
                  <option value="PORCENTAJE">Porcentaje %</option>
                  <option value="MONTO_FIJO">Monto fijo Bs.</option>
                </select>
                <input required type="number" min={0} step="0.01" value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder={form.tipo === "PORCENTAJE" ? "10" : "50"} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} value={form.montoMinimo}
                  onChange={(e) => setForm((f) => ({ ...f, montoMinimo: e.target.value }))}
                  placeholder="Monto mín. (opt)" className={inputCls} />
                <input type="number" min={1} value={form.maxUsos}
                  onChange={(e) => setForm((f) => ({ ...f, maxUsos: e.target.value }))}
                  placeholder="Máx. usos (opt)" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">Desde
                  <input type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} className={inputCls} />
                </label>
                <label className="text-xs text-slate-500">Hasta
                  <input type="date" value={form.fechaFin} onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))} className={inputCls} />
                </label>
              </div>
              <button type="submit" disabled={creando}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200">
                {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear cupón global
              </button>
            </form>
          </div>
        </div>

        {/* Listas */}
        <div className="lg:col-span-3 space-y-6">
          {loading && !data ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : (
            <>
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Globales ({globales.length})
                </h2>
                {globales.length === 0
                  ? <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-200 p-6 text-center">Sin cupones globales</p>
                  : <div className="space-y-2">{globales.map(fila)}</div>}
              </section>

              {deTienda.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    De tiendas ({deTienda.length})
                  </h2>
                  <div className="space-y-2">{deTienda.map(fila)}</div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
