"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LISTAR_USUARIOS } from "@/graphql/admin/queries";
import { TOGGLE_ACTIVO_USUARIO, CAMBIAR_ROL_USUARIO, VERIFICAR_VENDEDOR } from "@/graphql/admin/mutations";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Search, Loader2, CheckCircle, XCircle, ToggleLeft, ToggleRight, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";
import Link from "next/link";

interface UsuarioAdmin {
  id: string; email: string; rol: string; verificado: boolean; activo: boolean; creadoEn: string;
  perfilVendedor:  { id: string; nombreNegocio: string; ciudad: string; verificado: boolean } | null;
  perfilComprador: { id: string; nombreCompleto: string } | null;
}

const FILAS = 15;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminUsuariosPage() {
  const [search,    setSearch]    = useState("");
  const [rolFiltro, setRolFiltro] = useState<"TODOS" | "ADMIN" | "VENDEDOR" | "COMPRADOR">("TODOS");
  const [pagina,    setPagina]    = useState(1);

  const { data, loading, refetch } = useQuery<{
    listarUsuarios: { items: UsuarioAdmin[]; total: number; totalPaginas: number }
  }>(LISTAR_USUARIOS, {
    variables: { pagina: 1, limite: 200 },
    fetchPolicy: "cache-and-network",
  });

  const [toggleActivo, { loading: toggling }] = useMutation(TOGGLE_ACTIVO_USUARIO);
  const [cambiarRol,   { loading: changing }] = useMutation(CAMBIAR_ROL_USUARIO);
  const [verificarVendedor] = useMutation(VERIFICAR_VENDEDOR);

  async function handleVerificar(vendedorId: string, verificado: boolean) {
    try {
      await verificarVendedor({ variables: { vendedorId, verificado: !verificado } });
      await refetch();
      toast.success(!verificado ? "Vendedor verificado." : "Verificación quitada.");
    } catch {
      toast.error("No se pudo actualizar la verificación.");
    }
  }

  const todos = data?.listarUsuarios?.items ?? [];
  const filtrados = todos.filter((u) => {
    const matchRol = rolFiltro === "TODOS" || u.rol === rolFiltro;
    const nombre   = u.perfilVendedor?.nombreNegocio ?? u.perfilComprador?.nombreCompleto ?? "";
    const matchQ   = search === "" ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      nombre.toLowerCase().includes(search.toLowerCase());
    return matchRol && matchQ;
  });

  const totalPaginas = Math.ceil(filtrados.length / FILAS);
  const paginados    = filtrados.slice((pagina - 1) * FILAS, pagina * FILAS);

  async function handleToggle(id: string, activo: boolean) {
    try {
      await toggleActivo({ variables: { id } });
      toast.success(activo ? "Cuenta desactivada." : "Cuenta activada.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  async function handleCambiarRol(id: string, rolActual: string) {
    const roles = ["ADMIN", "VENDEDOR", "COMPRADOR"].filter(r => r !== rolActual);
    const nuevoRol = prompt(`Cambiar rol de ${rolActual} a:\n${roles.join(" / ")}\n\nEscribe el nuevo rol:`);
    if (!nuevoRol || !roles.includes(nuevoRol.toUpperCase())) {
      toast.error("Rol inválido.");
      return;
    }
    try {
      await cambiarRol({ variables: { id, rol: nuevoRol.toUpperCase() } });
      toast.success("Rol actualizado.");
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError ? (err.graphQLErrors[0]?.message ?? "Error.") : "Error.";
      toast.error(msg);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-400 mt-0.5">{data?.listarUsuarios?.total ?? 0} usuarios registrados en total</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
            placeholder="Buscar por email o nombre…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
          />
        </div>
        <FilterPills
          ariaLabel="Filtrar por rol"
          accent="slate"
          value={rolFiltro}
          onChange={(rol) => { setRolFiltro(rol); setPagina(1); }}
          options={(["TODOS", "ADMIN", "VENDEDOR", "COMPRADOR"] as const).map((rol) => ({
            value: rol,
            label: rol === "TODOS" ? "Todos" : rol.charAt(0) + rol.slice(1).toLowerCase(),
            count: rol === "TODOS"
              ? todos.length
              : todos.filter((u) => u.rol === rol).length,
          }))}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Cargando usuarios…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Users} titulo="Sin resultados" subtitulo="Intenta con otros filtros o búsqueda." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{filtrados.length} usuario{filtrados.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Verificado</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Registro</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginados.map((u, i) => {
                const nombre = u.perfilVendedor?.nombreNegocio ?? u.perfilComprador?.nombreCompleto ?? "—";
                return (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/usuarios/${u.id}`} className="hover:text-indigo-600 transition-colors">
                        <p className="font-medium text-slate-900">{nombre}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleCambiarRol(u.id, u.rol)}
                        disabled={changing}
                        title="Cambiar rol"
                        className="hover:opacity-70 transition-opacity"
                      >
                        <Badge variant={u.rol.toLowerCase() as "admin" | "vendedor" | "comprador"} size="sm" />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {u.verificado
                        ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle    className="h-4 w-4 text-slate-300 mx-auto" />
                      }
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={u.activo ? "activo" : "inactivo"} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-slate-400">{formatFecha(u.creadoEn)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {u.perfilVendedor && (
                          <button
                            onClick={() => handleVerificar(u.perfilVendedor!.id, u.perfilVendedor!.verificado)}
                            title={u.perfilVendedor.verificado ? "Quitar verificación de microempresa" : "Verificar microempresa"}
                            className={`p-1.5 rounded-lg transition-colors ${u.perfilVendedor.verificado ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100"}`}
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </button>
                        )}
                        <ConfirmDialog
                          title={u.activo ? "Desactivar cuenta" : "Activar cuenta"}
                          description={`¿${u.activo ? "Desactivar" : "Activar"} la cuenta de ${u.email}?`}
                          confirmLabel={u.activo ? "Desactivar" : "Activar"}
                          variant={u.activo ? "danger" : "default"}
                          onConfirm={() => handleToggle(u.id, u.activo)}
                          trigger={
                            <button
                              disabled={toggling}
                              title={u.activo ? "Desactivar cuenta" : "Activar cuenta"}
                              className={`p-1.5 rounded-lg transition-colors ${u.activo ? "hover:bg-red-50" : "hover:bg-emerald-50"}`}
                            >
                              {u.activo
                                ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                                : <ToggleLeft  className="h-4 w-4 text-slate-300" />
                              }
                            </button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {(pagina - 1) * FILAS + 1}–{Math.min(pagina * FILAS, filtrados.length)} de {filtrados.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                             hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
