"use client";

import {
  createContext, useContext, useState, useCallback, type ReactNode,
} from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { MI_CARRITO } from "@/graphql/carrito/queries";
import {
  AGREGAR_AL_CARRITO,
  ACTUALIZAR_CANTIDAD,
  ELIMINAR_DEL_CARRITO,
  VACIAR_CARRITO,
} from "@/graphql/carrito/mutations";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { ApolloError } from "@apollo/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItemCarrito {
  id:             string;
  cantidad:       number;
  precioSnapshot: string;
  subtotal:       string;
  producto: {
    id:      string;
    nombre:  string;
    precio:  string;
    stock:   number;
    activo:  boolean;
    imagenes: { url: string; orden: number }[];
    vendedor?: { id: string; nombreNegocio: string };
  };
}

export interface Carrito {
  id:         string;
  total:      string;
  totalItems: number;
  items:      ItemCarrito[];
}

interface CartContextValue {
  carrito:        Carrito | null;
  isLoading:      boolean;
  isOpen:         boolean;
  openCart:       () => void;
  closeCart:      () => void;
  agregar:        (productoId: string, cantidad: number) => Promise<void>;
  actualizar:     (productoId: string, cantidad: number) => Promise<void>;
  eliminar:       (productoId: string) => Promise<void>;
  vaciar:         () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isComprador = user?.rol === "COMPRADOR";
  const [isOpen, setIsOpen] = useState(false);

  const { data, loading } = useQuery<{ miCarrito: Carrito | null }>(MI_CARRITO, {
    skip:        !isComprador,
    fetchPolicy: "cache-and-network",
  });

  const [mutAgregar]    = useMutation(AGREGAR_AL_CARRITO);
  const [mutActualizar] = useMutation(ACTUALIZAR_CANTIDAD);
  const [mutEliminar]   = useMutation(ELIMINAR_DEL_CARRITO);
  const [mutVaciar]     = useMutation(VACIAR_CARRITO);
  const client          = useApolloClient();

  const refetch = useCallback(() =>
    client.refetchQueries({ include: [MI_CARRITO] }), [client]);

  const agregar = useCallback(async (productoId: string, cantidad: number) => {
    try {
      await mutAgregar({ variables: { productoId, cantidad } });
      await refetch();
      setIsOpen(true);
      toast.success("Producto agregado al carrito.");
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "No se pudo agregar al carrito.")
        : "No se pudo agregar al carrito.";
      toast.error(msg);
    }
  }, [mutAgregar, refetch]);

  const actualizar = useCallback(async (productoId: string, cantidad: number) => {
    try {
      await mutActualizar({ variables: { productoId, cantidad } });
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof ApolloError
        ? (err.graphQLErrors[0]?.message ?? "Error al actualizar cantidad.")
        : "Error al actualizar cantidad.";
      toast.error(msg);
    }
  }, [mutActualizar, refetch]);

  const eliminar = useCallback(async (productoId: string) => {
    try {
      await mutEliminar({ variables: { productoId } });
      await refetch();
    } catch {
      toast.error("No se pudo eliminar el producto.");
    }
  }, [mutEliminar, refetch]);

  const vaciar = useCallback(async () => {
    try {
      await mutVaciar();
      await refetch();
    } catch {
      toast.error("No se pudo vaciar el carrito.");
    }
  }, [mutVaciar, refetch]);

  return (
    <CartContext.Provider value={{
      carrito:    data?.miCarrito ?? null,
      isLoading:  loading,
      isOpen,
      openCart:   () => setIsOpen(true),
      closeCart:  () => setIsOpen(false),
      agregar,
      actualizar,
      eliminar,
      vaciar,
    }}>
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
