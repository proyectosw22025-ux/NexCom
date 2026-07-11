"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { USUARIO_DETALLE } from "@/graphql/admin/queries";
import { TOGGLE_ACTIVO_USUARIO, CAMBIAR_ROL_USUARIO } from "@/graphql/admin/mutations";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft, Users, Loader2, CheckCircle, XCircle,
  Store, ShoppingBag, Shield, ToggleRight, ToggleLeft,
} from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import Link from "next/link";

interface UsuarioDetalle {
  id: string; email: string; rol: string; verificado: boolean; activo: boolean; creadoEn: string;
  perfilVendedor: {
    id: string; nombreNegocio: string; ciudad: string;
    ratingPromedio: string; totalVentas: number; totalResenias: number;
  } | null;
  perfilComprador: { id: string; nombreCompleto: string; telefono: string | null } | null;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

const ROLES = ["ADMIN", "VENDEDOR", "CLIENTE"] as const;
type Rol = typeof ROLES[number];

export default function AdminUsuarioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data, loading, refetch } = useQuery<{ usuarioDetalle: UsuarioDetalle }>(
    USUARIO_DETALLE, { variables: { id }, fetchPolicy: "cache-and-network" },
  );

  const [toggleActivo, { loading: toggling }] = useMutation(TOGGLE_ACTIVO_USUARIO);
  const [cambiarRol,   { loading: changing }] = useMutation(CAMBIAR_ROL_USUARIO);

  const u = data?.usuarioDetalle;

  async function handleToggle() {
    if (!u) return;
    if (!confirm(`¿${u.activo ? "Desactivar" : "Activar"} la cuenta de ${u.email}?`)) return;
    try {
      await toggleActivo({ variables: { id } });
      toast.success(u.activo ? "Cuenta desactivada." : "Cuenta activada.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  async function handleCambiarRol(nuevoRol: Rol) {
    if (!u || nuevoRol === u.rol) return;
    if (!confirm(`¿Cambiar el rol de ${u.email} a ${nuevoRol}?`)) return;
    try {
      await cambiarRol({ variables: { id, rol: nuevoRol } });
      toast.success("Rol actualizado.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="text-sm text-slate-400">Cargando usuario…</p>
      </div>
    );
  }

  if (!u) {
    return (
      <div className="p-8 text-center">
        <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">Usuario no encontrado</p>
        <Link href="/admin/usuarios" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          ← Volver a usuarios
        </Link>
      </div>
    );
  }

  const RolIcon = u.rol === "ADMIN" ? Shield : u.rol === "VENDEDOR" ? Store : ShoppingBag;

  return (
    <div className="p-8 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {u.perfilVendedor?.nombreNegocio ?? u.perfilComprador?.nombreCompleto ?? u.email}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{u.email}</p>
        </div>
        <Badge variant={u.rol.toLowerCase() as "admin" | "vendedor" | "cliente"} />
      </div>

      {/* Estado general */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Estado",     value: <Badge variant={u.activo ? "activo" : "inactivo"} size="sm" /> },
          { label: "Verificado", value: u.verificado ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" /> },
          { label: "Registrado", value: <span className="text-xs text-slate-600">{formatFecha(u.creadoEn)}</span> },
          { label: "Rol actual", value: <span className="text-xs font-semibold text-slate-700">{u.rol}</span> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Perfil */}
      {u.perfilVendedor && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <RolIcon className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Perfil Vendedor</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Negocio",    value: u.perfilVendedor.nombreNegocio },
              { label: "Ciudad",     value: u.perfilVendedor.ciudad },
              { label: "Rating",     value: `⭐ ${u.perfilVendedor.ratingPromedio}` },
              { label: "Ventas",     value: u.perfilVendedor.totalVentas },
              { label: "Reseñas",   value: u.perfilVendedor.totalResenias },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {u.perfilComprador && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <RolIcon className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Perfil Cliente</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Nombre completo", value: u.perfilComprador.nombreCompleto },
              { label: "Teléfono",        value: u.perfilComprador.telefono ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Acciones de administración</h2>

        <div className="space-y-3">
          {/* Toggle activo */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-900">{u.activo ? "Cuenta activa" : "Cuenta desactivada"}</p>
              <p className="text-xs text-slate-400 mt-0.5">{u.activo ? "El usuario puede iniciar sesión." : "El usuario no puede acceder."}</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                u.activo
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              } disabled:opacity-40`}
            >
              {u.activo
                ? <><ToggleRight className="h-4 w-4" /> Desactivar</>
                : <><ToggleLeft  className="h-4 w-4" /> Activar</>
              }
            </button>
          </div>

          {/* Cambiar rol */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-sm font-medium text-slate-900 mb-2">Cambiar rol</p>
            <div className="flex gap-2">
              {ROLES.filter(r => r !== u.rol).map((rol) => (
                <button
                  key={rol}
                  onClick={() => handleCambiarRol(rol)}
                  disabled={changing}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl
                             hover:bg-slate-100 transition-colors disabled:opacity-40"
                >
                  → {rol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
