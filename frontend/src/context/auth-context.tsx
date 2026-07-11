"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apolloClient, purgePersistedCache } from "@/lib/apollo-client";
import { ME } from "@/graphql/auth/queries";
import { REFRESH_TOKEN, LOGOUT } from "@/graphql/auth/mutations";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Rol = "ADMIN" | "VENDEDOR" | "CLIENTE";

export interface UsuarioSesion {
  id:              string;
  email:           string;
  rol:             Rol;
  verificado:      boolean;
  perfilVendedor?: { id: string; nombreNegocio: string; verificado?: boolean } | null;
  perfilComprador?:{ id: string; nombreCompleto: string } | null;
}

interface MeData       { me: UsuarioSesion }
interface RefreshData  { refreshToken: { accessToken: string; refreshToken: string; usuario: UsuarioSesion } }

interface AuthState {
  user:      UsuarioSesion | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login:   (accessToken: string, refreshToken: string, usuario: UsuarioSesion) => void;
  logout:  () => Promise<void>;
  refresh: () => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_KEY  = "nexcom_access_token";
const REFRESH_KEY = "nexcom_refresh_token";

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.user) return;
    const interval = setInterval(() => { refresh(); }, 13 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user]);

  async function restoreSession() {
    const accessToken  = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    if (!accessToken && !refreshToken) {
      setState({ user: null, isLoading: false });
      return;
    }

    if (accessToken) {
      try {
        const { data } = await apolloClient.query<MeData>({
          query:       ME,
          fetchPolicy: "network-only",
          context: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
        if (data?.me) {
          setRolCookie(data.me.rol);
          setState({ user: data.me, isLoading: false });
          return;
        }
      } catch { /* token expirado — intentar refresh */ }
    }

    if (refreshToken) {
      const ok = await refreshWithToken(refreshToken);
      if (ok) return;
    }

    clearTokens();
    setState({ user: null, isLoading: false });
  }

  const login = useCallback(
    (accessToken: string, refreshToken: string, usuario: UsuarioSesion) => {
      localStorage.setItem(ACCESS_KEY,  accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      setRolCookie(usuario.rol);
      setState({ user: usuario, isLoading: false });
    },
    []
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      await apolloClient.mutate({
        mutation:  LOGOUT,
        variables: { refreshToken },
      });
    } catch { /* limpiar localmente de todas formas */ }
    clearTokens();
    apolloClient.clearStore();
    purgePersistedCache(); // no dejar saldo/pedidos de un usuario en el dispositivo
    setState({ user: null, isLoading: false });
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return false;
    return refreshWithToken(rt);
  }, []);

  async function refreshWithToken(token: string): Promise<boolean> {
    try {
      const { data } = await apolloClient.mutate<RefreshData>({
        mutation:  REFRESH_TOKEN,
        variables: { token },
      });
      if (data?.refreshToken) {
        const { accessToken, refreshToken, usuario } = data.refreshToken;
        localStorage.setItem(ACCESS_KEY,  accessToken);
        localStorage.setItem(REFRESH_KEY, refreshToken);
        setRolCookie(usuario.rol);
        setState({ user: usuario, isLoading: false });
        return true;
      }
    } catch { /* refresh token inválido */ }
    setState({ user: null, isLoading: false });
    return false;
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  document.cookie = "nexcom_rol=; max-age=0; path=/";
}

function setRolCookie(rol: string) {
  document.cookie = `nexcom_rol=${rol}; max-age=${7 * 24 * 3600}; path=/; SameSite=Lax`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
