"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, ApolloError } from "@apollo/client";
import Link from "next/link";
import { MIS_PRODUCTOS } from "@/graphql/productos/queries";
import { MIS_OFERTAS } from "@/graphql/ofertas/queries";
import { ACTUALIZAR_OFERTA } from "@/graphql/ofertas/mutations";
import { ArrowLeft, Loader2, Tag, Package } from "lucide-react";
import { toast } from "sonner";
import type { ProductoCardData } from "@/components/productos/ProductoCard";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { ProductoPicker } from "@/components/vendedor/ProductoPicker";

interface OfertaLista {
  id: string; titulo: string; descripcion: string | null; descuento: string;
  fechaInicio: string; fechaFin: string; estado: string;
  productos: { id: string }[];
}

function toLocalInput(iso: string) {
  // ISO → valor de <input datetime-local> ("YYYY-MM-DDTHH:mm") en hora local
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function EditarOfertaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data: ofData, loading: loadingOf } = useQuery<{ misOfertas: OfertaLista[] }>(MIS_OFERTAS, {
    fetchPolicy: "cache-and-network",
  });
  const { data: prodData, loading: loadingProds } = useQuery<{ misProductos: ProductoCardData[] }>(
    MIS_PRODUCTOS, { fetchPolicy: "cache-and-network" },
  );
  const [actualizarOferta] = useMutation(ACTUALIZAR_OFERTA);

  const oferta = ofData?.misOfertas.find((o) => o.id === id);
  const productos = (prodData?.misProductos ?? []).filter((p) => p.activo);

  const [form, setForm] = useState<{ titulo: string; descripcion: string; descuento: string; fechaFin: string } | null>(null);
  const [productoIds, setProductoIds] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inicializa el formulario una vez que llega la oferta (sin useEffect: memo + fallback).
  const inicial = useMemo(() => {
    if (!oferta) return null;
    return {
      form: {
        titulo: oferta.titulo,
        descripcion: oferta.descripcion ?? "",
        descuento: oferta.descuento,
        fechaFin: toLocalInput(oferta.fechaFin),
      },
      ids: oferta.productos.map((p) => p.id),
    };
  }, [oferta]);

  const formActual = form ?? inicial?.form ?? { titulo: "", descripcion: "", descuento: "", fechaFin: "" };
  const idsActual = productoIds ?? inicial?.ids ?? [];

  const editable = oferta && (oferta.estado === "ACTIVA" || oferta.estado === "PROGRAMADA");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (idsActual.length === 0) { toast.error("Selecciona al menos un producto."); return; }
    const descuento = parseFloat(formActual.descuento);
    if (isNaN(descuento) || descuento <= 0 || descuento > 100) {
      toast.error("El descuento debe ser entre 1% y 100%."); return;
    }
    if (!formActual.fechaFin) { toast.error("La fecha de fin es requerida."); return; }
    setSubmitting(true);
    try {
      await actualizarOferta({
        variables: {
          id,
          input: {
            titulo: formActual.titulo,
            descripcion: formActual.descripcion || null,
            descuento,
            fechaFin: new Date(formActual.fechaFin).toISOString(),
            productoIds: idsActual,
          },
        },
      });
      toast.success("Oferta actualizada.");
      router.push("/vendedor/ofertas");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error al actualizar.") : "Error al actualizar.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const cargando = loadingOf && !ofData;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vendedor/ofertas" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar oferta</h1>
          <p className="text-sm text-slate-400 mt-0.5">Actualiza el descuento, la fecha de fin o los productos</p>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando oferta…</p>
        </div>
      ) : !oferta ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-16">
          <Tag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Oferta no encontrada</p>
          <Link href="/vendedor/ofertas" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">← Volver a mis ofertas</Link>
        </div>
      ) : !editable ? (
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/50 text-center py-16">
          <p className="font-semibold text-slate-700">Esta oferta está {oferta.estado.toLowerCase()} y no se puede editar.</p>
          <Link href="/vendedor/ofertas" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">← Volver a mis ofertas</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Datos de la oferta</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Título *</label>
              <input
                required
                value={formActual.titulo}
                onChange={(e) => setForm({ ...formActual, titulo: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Descripción (opcional)</label>
              <textarea
                value={formActual.descripcion}
                onChange={(e) => setForm({ ...formActual, descripcion: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Descuento (%) *</label>
                <div className="relative">
                  <input
                    required type="number" min={1} max={100} step={0.5}
                    value={formActual.descuento}
                    onChange={(e) => setForm({ ...formActual, descuento: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Fecha fin *</label>
                <DateTimePicker
                  value={formActual.fechaFin}
                  onChange={(v) => setForm({ ...formActual, fechaFin: v })}
                  min={oferta.fechaInicio.slice(0, 16)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">La fecha de inicio ({new Date(oferta.fechaInicio).toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" })}) no se puede modificar.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Productos incluidos *</h2>
            </div>
            {loadingProds ? (
              <div className="flex items-center gap-2 py-6 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos…
              </div>
            ) : (
              <ProductoPicker productos={productos} seleccionados={idsActual} onChange={setProductoIds} />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <><Tag className="h-4 w-4" /> Guardar cambios</>}
            </button>
            <Link href="/vendedor/ofertas" className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
