"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Rocket, ArrowRight } from "lucide-react";

interface OnboardingVendedorProps {
  totalProductos: number;
  destacados:     number;
}

/**
 * Guía de primeros pasos para vendedores nuevos. Los pasos se derivan del estado
 * real del catálogo (sin datos inventados). Desaparece cuando se completan todos.
 */
export function OnboardingVendedor({ totalProductos, destacados }: OnboardingVendedorProps) {
  const pasos = [
    {
      hecho: totalProductos >= 1,
      titulo: "Publica tu primer producto",
      desc:   "Empieza tu tienda con al menos un producto a la venta.",
      href:   "/vendedor/productos/nuevo",
      cta:    "Crear producto",
    },
    {
      hecho: totalProductos >= 3,
      titulo: "Arma tu catálogo",
      desc:   "Las tiendas con 3 o más productos venden más. Vas " + Math.min(totalProductos, 3) + "/3.",
      href:   "/vendedor/productos/nuevo",
      cta:    "Agregar otro",
    },
    {
      hecho: destacados >= 1,
      titulo: "Destaca un producto",
      desc:   "Dale más visibilidad a tu mejor producto en el catálogo.",
      href:   "/vendedor/productos",
      cta:    "Destacar",
    },
  ];

  const completados = pasos.filter((p) => p.hecho).length;
  if (completados === pasos.length) return null; // onboarding terminado

  const pct = Math.round((completados / pasos.length) * 100);
  const siguiente = pasos.find((p) => !p.hecho);

  return (
    <div className="surface-brand-soft rounded-2xl border border-indigo-100 p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Primeros pasos en NexCom</h2>
            <p className="text-xs text-slate-500">Completa tu tienda para empezar a vender</p>
          </div>
        </div>
        <span className="text-xs font-bold text-indigo-600 shrink-0">{completados}/{pasos.length}</span>
      </div>

      {/* Progreso */}
      <div className="h-1.5 bg-white rounded-full overflow-hidden mb-4">
        <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2">
        {pasos.map((paso) => (
          <li
            key={paso.titulo}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              paso.hecho ? "bg-white/50 border-transparent" : "bg-white border-slate-200"
            }`}
          >
            {paso.hecho
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              : <Circle className="h-5 w-5 text-slate-300 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${paso.hecho ? "text-slate-400 line-through" : "text-slate-900"}`}>
                {paso.titulo}
              </p>
              {!paso.hecho && <p className="text-xs text-slate-500">{paso.desc}</p>}
            </div>
            {!paso.hecho && paso === siguiente && (
              <Link
                href={paso.href}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs
                           font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {paso.cta} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
