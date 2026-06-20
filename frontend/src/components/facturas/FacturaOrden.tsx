"use client";

import { useState } from "react";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { FACTURA_DE_ORDEN, SOLICITAR_FACTURA } from "@/graphql/facturas";

interface FacturaItem { nombre: string; cantidad: number; precioUnitario: string; subtotal: string }
interface Factura {
  id: string; numero: number; nitComprador: string; razonSocial: string;
  importeTotal: string; neto: string; iva: string; codigoControl: string; fechaEmision: string;
  emisorNombre: string; emisorCiudad: string; items: FacturaItem[];
}

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Sección de factura (estilo boliviano) para el comprador en el detalle de orden. */
export function FacturaOrden({ ordenId }: { ordenId: string }) {
  const { data, loading } = useQuery<{ facturaDeOrden: Factura | null }>(FACTURA_DE_ORDEN, {
    variables: { ordenId }, fetchPolicy: "cache-and-network",
  });
  const [solicitar, { loading: emitiendo }] = useMutation(SOLICITAR_FACTURA);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ nitComprador: "", razonSocial: "" });

  const factura = data?.facturaDeOrden ?? null;

  async function handleEmitir(e: React.FormEvent) {
    e.preventDefault();
    try {
      await solicitar({
        variables: { ordenId, ...form },
        refetchQueries: [{ query: FACTURA_DE_ORDEN, variables: { ordenId } }],
      });
      toast.success("Factura emitida.");
      setAbierto(false);
    } catch (err: unknown) {
      toast.error(err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.");
    }
  }

  if (loading && !data) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-6 h-20 animate-pulse" />;
  }

  // Factura emitida → mostrarla
  if (factura) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:border-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 print:hidden">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" /> Factura
          </h2>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
        </div>

        <div className="p-6 text-sm">
          <div className="text-center border-b border-dashed border-slate-200 pb-3 mb-3">
            <p className="font-extrabold text-slate-900 uppercase tracking-wide">{factura.emisorNombre}</p>
            <p className="text-xs text-slate-500">{factura.emisorCiudad} — Bolivia</p>
            <p className="text-xs text-slate-500 mt-1">FACTURA N° {String(factura.numero).padStart(6, "0")}</p>
          </div>

          <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 mb-3">
            <p><span className="text-slate-400">Fecha:</span> {fecha(factura.fechaEmision)}</p>
            <p className="text-right"><span className="text-slate-400">NIT/CI:</span> {factura.nitComprador}</p>
            <p className="col-span-2"><span className="text-slate-400">Señor(es):</span> {factura.razonSocial}</p>
          </div>

          <table className="w-full text-xs mb-3">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left font-medium py-1">Detalle</th>
                <th className="text-center font-medium py-1">Cant.</th>
                <th className="text-right font-medium py-1">P. Unit.</th>
                <th className="text-right font-medium py-1">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {factura.items.map((it, i) => (
                <tr key={i} className="text-slate-700">
                  <td className="py-1">{it.nombre}</td>
                  <td className="text-center py-1">{it.cantidad}</td>
                  <td className="text-right py-1">{it.precioUnitario}</td>
                  <td className="text-right py-1">{it.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-100 pt-2 space-y-0.5 text-xs">
            <div className="flex justify-between text-slate-500"><span>Neto</span><span>Bs. {factura.neto}</span></div>
            <div className="flex justify-between text-slate-500"><span>IVA (13%)</span><span>Bs. {factura.iva}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-sm pt-1"><span>TOTAL</span><span>Bs. {factura.importeTotal}</span></div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-center">
            <p className="text-[10px] text-slate-400 font-mono">Código de control: {factura.codigoControl}</p>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              Esta factura contribuye al desarrollo del país. El uso ilícito será sancionado de acuerdo a Ley.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sin factura → formulario
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {!abierto ? (
        <button
          onClick={() => setAbierto(true)}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600
                     font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
        >
          <FileText className="h-4 w-4" /> Solicitar factura
        </button>
      ) : (
        <form onSubmit={handleEmitir} className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Datos de facturación</h3>
          <input
            value={form.nitComprador}
            onChange={(e) => setForm((f) => ({ ...f, nitComprador: e.target.value }))}
            placeholder="NIT o CI (usa 0 para “sin nombre”)"
            inputMode="numeric"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <input
            value={form.razonSocial}
            onChange={(e) => setForm((f) => ({ ...f, razonSocial: e.target.value }))}
            placeholder="Razón social / Nombre"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <div className="flex gap-3">
            <button
              type="submit" disabled={emitiendo}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                         text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
            >
              {emitiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Emitir factura
            </button>
            <button type="button" onClick={() => setAbierto(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
