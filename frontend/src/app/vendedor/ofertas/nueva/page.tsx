"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { MIS_PRODUCTOS } from "@/graphql/productos/queries";
import { CREAR_OFERTA } from "@/graphql/ofertas/mutations";
import { ArrowLeft, Loader2, Tag, Package, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import type { ProductoCardData } from "@/components/productos/ProductoCard";

export default function NuevaOfertaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    titulo:      "",
    descripcion: "",
    descuento:   "",
    fechaInicio: new Date().toISOString().slice(0, 16),
    fechaFin:    "",
  });
  const [productoIds, setProductoIds] = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  const { data: prodData, loading: loadingProds } = useQuery<{ misProductos: ProductoCardData[] }>(
    MIS_PRODUCTOS, { fetchPolicy: "cache-and-network" },
  );
  const [crearOferta] = useMutation(CREAR_OFERTA);

  const productos = (prodData?.misProductos ?? []).filter((p) => p.activo);

  function toggleProducto(id: string) {
    setProductoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (productoIds.length === 0) {
      toast.error("Selecciona al menos un producto.");
      return;
    }
    const descuento = parseFloat(form.descuento);
    if (isNaN(descuento) || descuento <= 0 || descuento > 100) {
      toast.error("El descuento debe ser entre 1% y 100%.");
      return;
    }
    if (!form.fechaFin) {
      toast.error("La fecha de fin es requerida.");
      return;
    }
    setSubmitting(true);
    try {
      await crearOferta({
        variables: {
          input: {
            titulo:      form.titulo,
            descripcion: form.descripcion || null,
            descuento,
            fechaInicio: new Date(form.fechaInicio).toISOString(),
            fechaFin:    new Date(form.fechaFin).toISOString(),
            productoIds,
          },
        },
      });
      toast.success("Oferta creada exitosamente.");
      router.push("/vendedor/ofertas");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al crear oferta.")
        : "Error al crear oferta.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/vendedor/ofertas"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva oferta</h1>
          <p className="text-sm text-slate-400 mt-0.5">Crea una oferta con descuento por tiempo limitado</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos de la oferta */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Datos de la oferta</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Título *
            </label>
            <input
              required
              value={form.titulo}
              onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
              placeholder="Ej: Descuento de verano 20%"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Describe brevemente la oferta…"
              rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Descuento (%) *
            </label>
            <div className="relative max-w-xs">
              <input
                required
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={form.descuento}
                onChange={(e) => setForm((p) => ({ ...p, descuento: e.target.value }))}
                placeholder="20"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Fecha inicio *
              </label>
              <input
                required
                type="datetime-local"
                value={form.fechaInicio}
                onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Fecha fin *
              </label>
              <input
                required
                type="datetime-local"
                value={form.fechaFin}
                onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))}
                min={form.fechaInicio}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Selector de productos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Productos incluidos *
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {productoIds.length} seleccionado{productoIds.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loadingProds ? (
            <div className="flex items-center gap-2 py-6 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos…
            </div>
          ) : productos.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">
              No tienes productos activos. <Link href="/vendedor/productos/nuevo" className="text-indigo-600 hover:underline">Crear uno →</Link>
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {productos.map((p) => {
                const selected = productoIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProducto(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      selected
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {selected
                      ? <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                      : <Square      className="h-4 w-4 text-slate-300 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-slate-400">{p.categoria.nombre} · Stock: {p.stock}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 shrink-0">
                      Bs. {p.precio}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                       text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors
                       shadow-sm shadow-indigo-200"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</>
              : <><Tag className="h-4 w-4" /> Crear oferta</>
            }
          </button>
          <Link
            href="/vendedor/ofertas"
            className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm
                       hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
