"use client";

import { useQuery, useMutation, ApolloError } from "@apollo/client";
import { Loader2, Check, Crown, Zap } from "lucide-react";
import { toast } from "sonner";
import { ME } from "@/graphql/auth/queries";
import { MEJORAR_PLAN } from "@/graphql/auth/mutations";

interface MeData {
  me: { perfilVendedor: { id: string; plan: string } | null } | null;
}

const BENEFICIOS = {
  FREE: ["Hasta 50 productos activos", "Tienda pública", "Gestión de órdenes y cupones"],
  PRO:  ["Hasta 500 productos activos", "Destaca hasta 3 productos", "Prioridad en el catálogo", "Insignia PRO en tu tienda"],
};

export default function VendedorPlanPage() {
  const { data, loading, refetch } = useQuery<MeData>(ME, { fetchPolicy: "cache-and-network" });
  const [mejorarPlan, { loading: cambiando }] = useMutation(MEJORAR_PLAN);

  const plan = data?.me?.perfilVendedor?.plan ?? "FREE";

  async function cambiar(nuevo: "FREE" | "PRO") {
    try {
      await mejorarPlan({ variables: { plan: nuevo } });
      toast.success(nuevo === "PRO" ? "¡Bienvenido al plan PRO!" : "Plan actualizado a FREE.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  function PlanCard({ tipo, precio, icon: Icon, accent }: {
    tipo: "FREE" | "PRO"; precio: string; icon: typeof Zap; accent: string;
  }) {
    const actual = plan === tipo;
    return (
      <div className={`rounded-2xl border p-6 flex flex-col ${actual ? `${accent} shadow-md` : "border-slate-200 bg-white"}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-5 w-5 ${tipo === "PRO" ? "text-amber-500" : "text-slate-500"}`} />
          <h2 className="text-lg font-bold text-slate-900">Plan {tipo}</h2>
          {actual && <span className="ml-auto text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">Actual</span>}
        </div>
        <p className="text-2xl font-extrabold text-slate-900 mb-4">{precio}</p>
        <ul className="space-y-2 flex-1">
          {BENEFICIOS[tipo].map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {b}
            </li>
          ))}
        </ul>
        {!actual && (
          <button
            onClick={() => cambiar(tipo)}
            disabled={cambiando}
            className={`mt-5 w-full flex items-center justify-center gap-2 font-semibold rounded-xl py-2.5 text-sm
                       transition-colors disabled:opacity-50 ${
                         tipo === "PRO"
                           ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200"
                           : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                       }`}
          >
            {cambiando ? <Loader2 className="h-4 w-4 animate-spin" /> : tipo === "PRO" ? <Crown className="h-4 w-4" /> : null}
            {tipo === "PRO" ? "Mejorar a PRO" : "Cambiar a FREE"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mi plan</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Elige el plan que mejor se ajusta a tu negocio. El cambio es inmediato (pago simulado).
        </p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <PlanCard tipo="FREE" precio="Gratis" icon={Zap} accent="border-slate-300 bg-slate-50" />
          <PlanCard tipo="PRO"  precio="Bs. 99 / mes" icon={Crown} accent="border-amber-300 bg-amber-50" />
        </div>
      )}
    </div>
  );
}
