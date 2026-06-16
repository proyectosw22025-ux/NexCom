"use client";

import { useQuery } from "@apollo/client";
import { Star, MessageSquare, Loader2, Store } from "lucide-react";
import { VALORACIONES_DE_VENDEDOR } from "@/graphql/valoraciones/queries";

interface Resena {
  id:           string;
  calificacion: number;
  comentario:   string | null;
  creadoEn:     string;
  respuesta:    { id: string; respuesta: string; creadoEn: string } | null;
}

function Estrellas({ valor, size = "h-4 w-4" }: { valor: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(valor) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
        />
      ))}
    </div>
  );
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

interface ProductoReseniasProps {
  vendedorId:     string;
  ratingPromedio?: string;
  totalResenias?: number;
}

/**
 * Reseñas del vendedor mostradas públicamente en la ficha de producto.
 * Las valoraciones en NexCom están ligadas al vendedor (vía órdenes
 * entregadas), por lo que son la señal de confianza del negocio.
 */
export function ProductoResenias({ vendedorId, ratingPromedio, totalResenias }: ProductoReseniasProps) {
  const { data, loading } = useQuery<{ valoracionesDeVendedor: Resena[] }>(VALORACIONES_DE_VENDEDOR, {
    variables: { vendedorId },
    skip: !vendedorId,
    fetchPolicy: "cache-and-network",
  });

  const resenas  = data?.valoracionesDeVendedor ?? [];
  const promedio = ratingPromedio ? parseFloat(ratingPromedio) : 0;
  const total    = totalResenias ?? resenas.length;

  return (
    <section className="mt-12 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">Reseñas del vendedor</h2>
      </div>

      {/* Resumen */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
        <div className="text-center px-3">
          <p className="text-3xl font-extrabold text-slate-900 leading-none">{promedio.toFixed(1)}</p>
          <div className="mt-1.5"><Estrellas valor={promedio} /></div>
        </div>
        <div className="border-l border-slate-200 pl-4">
          <p className="text-sm font-semibold text-slate-700">
            {total} reseña{total !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-400">Basado en compras entregadas</p>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 py-6 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Cargando reseñas…</span>
        </div>
      ) : resenas.length === 0 ? (
        <div className="text-center py-10">
          <Star className="h-9 w-9 text-slate-200 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Aún sin reseñas</p>
          <p className="text-xs text-slate-400 mt-0.5">Sé el primero en valorar a este vendedor tras tu compra</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {resenas.map((r) => (
            <li key={r.id} className="border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <Estrellas valor={r.calificacion} size="h-3.5 w-3.5" />
                <span className="text-xs text-slate-400">{formatFecha(r.creadoEn)}</span>
              </div>
              {r.comentario && <p className="text-sm text-slate-700">{r.comentario}</p>}

              {r.respuesta && (
                <div className="mt-3 ml-3 pl-3 border-l-2 border-indigo-100">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Store className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-slate-700">Respuesta del vendedor</span>
                  </div>
                  <p className="text-sm text-slate-600">{r.respuesta.respuesta}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
