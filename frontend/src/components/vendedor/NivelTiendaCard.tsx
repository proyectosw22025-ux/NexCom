"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { ShieldCheck, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { ME } from "@/graphql/auth/queries";
import { nivelConfianza, esVerificado, NIVELES } from "@/lib/nivel-confianza";

interface PerfilVendedor {
  estadoVerificacion?: string | null;
  verificado?: boolean;
  totalVentas?: number;
  ratingPromedio?: string | null;
}
interface MeData { me: { perfilVendedor: PerfilVendedor | null } | null }

/** Tarjeta de "Salud/Nivel de tu tienda": empuja al KYC mostrando el próximo beneficio. */
export function NivelTiendaCard() {
  const { data } = useQuery<MeData>(ME, { fetchPolicy: "cache-and-network" });
  const perfil = data?.me?.perfilVendedor;
  if (!perfil) return null;

  const nivel = nivelConfianza(perfil);
  const meta = NIVELES[nivel];
  const verificado = esVerificado(perfil);
  const estado = perfil.estadoVerificacion ?? "NO_ENVIADO";

  return (
    <div className={`rounded-2xl border p-5 mb-8 ${meta.bg}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
            <ShieldCheck className={`h-5 w-5 ${meta.color}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Nivel de tu tienda: {meta.emoji} {meta.label}</p>
            <ul className="mt-1.5 space-y-1">
              {meta.beneficios.slice(0, 3).map((b) => (
                <li key={b} className="text-xs text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {!verificado && estado !== "PENDIENTE" && (
          <Link
            href="/vendedor/verificacion"
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-sky-200"
          >
            Verificar mi tienda <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {estado === "PENDIENTE" && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-2 rounded-xl">
            <Clock className="h-3.5 w-3.5" /> Verificación en revisión
          </span>
        )}
      </div>

      {!verificado && estado !== "PENDIENTE" && (
        <p className="text-xs text-slate-500 mt-3">
          Verifica tu identidad para retirar fondos, ganar el sello de confianza y subir en el catálogo.
        </p>
      )}
    </div>
  );
}
