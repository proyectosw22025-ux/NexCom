"use client";

import { useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { MIS_OFERTAS } from "@/graphql/ofertas/queries";
import { CANCELAR_OFERTA } from "@/graphql/ofertas/mutations";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, Tag, Pencil, XCircle, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

interface OfertaProductoItem {
  id: string;
  nombre: string;
  precio: string;
}

interface Oferta {
  id: string;
  titulo: string;
  descripcion: string | null;
  descuento: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "PROGRAMADA" | "ACTIVA" | "VENCIDA" | "CANCELADA";
  creadoEn: string;
  productos: OfertaProductoItem[];
}

const estadoBadge: Record<Oferta["estado"], "activo" | "inactivo" | "pendiente" | "cancelado"> = {
  ACTIVA:     "activo",
  PROGRAMADA: "pendiente",
  VENCIDA:    "inactivo",
  CANCELADA:  "cancelado",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function VendedorOfertasPage() {
  const { data, loading, refetch } = useQuery<{ misOfertas: Oferta[] }>(MIS_OFERTAS, {
    fetchPolicy: "cache-and-network",
  });
  const [cancelarOferta, { loading: canceling }] = useMutation(CANCELAR_OFERTA);

  const ofertas = data?.misOfertas ?? [];

  async function handleCancelar(id: string) {
    try {
      await cancelarOferta({ variables: { id } });
      toast.success("Oferta cancelada.");
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al cancelar.")
        : "Error al cancelar.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Ofertas</h1>
          <p className="text-sm text-slate-400 mt-0.5">{ofertas.length} oferta{ofertas.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/vendedor/ofertas/nueva"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                     px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus className="h-4 w-4" /> Nueva oferta
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-xs text-slate-400">Cargando ofertas…</p>
        </div>
      ) : ofertas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
          <Tag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 mb-1">Sin ofertas</p>
          <p className="text-sm text-slate-400 mb-6">Crea tu primera oferta para atraer más compradores</p>
          <Link
            href="/vendedor/ofertas/nueva"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold
                       px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Crear oferta
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ofertas.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:shadow-slate-200/60 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{o.titulo}</h3>
                  {o.descripcion && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{o.descripcion}</p>
                  )}
                </div>
                <Badge
                  variant={estadoBadge[o.estado]}
                  label={o.estado.charAt(0) + o.estado.slice(1).toLowerCase()}
                  size="sm"
                  dot
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Tag className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-amber-600">{o.descuento}% OFF</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-0.5 mb-3">
                <p>Inicio: {formatFecha(o.fechaInicio)}</p>
                <p>Fin: {formatFecha(o.fechaFin)}</p>
              </div>

              {o.productos.length > 0 && (
                <div className="border-t border-slate-100 pt-3 mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {o.productos.length} producto{o.productos.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1">
                    {o.productos.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
                        <Package className="h-3 w-3 text-slate-300 shrink-0" />
                        <span className="truncate">{p.nombre}</span>
                        <span className="shrink-0 text-slate-400">Bs. {p.precio}</span>
                      </div>
                    ))}
                    {o.productos.length > 3 && (
                      <p className="text-xs text-slate-400">+{o.productos.length - 3} más</p>
                    )}
                  </div>
                </div>
              )}

              {(o.estado === "ACTIVA" || o.estado === "PROGRAMADA") && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href={`/vendedor/ofertas/${o.id}/editar`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                               border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                  <ConfirmDialog
                    title="Cancelar oferta"
                    description={`¿Cancelar la oferta "${o.titulo}"? Esta acción no se puede deshacer.`}
                    confirmLabel="Cancelar oferta"
                    variant="danger"
                    onConfirm={() => handleCancelar(o.id)}
                    trigger={
                      <button
                        disabled={canceling}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                                   border border-red-100 hover:bg-red-50 text-xs font-semibold text-red-500
                                   transition-colors disabled:opacity-40 w-full"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancelar
                      </button>
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
