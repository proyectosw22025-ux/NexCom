import { ApolloClient, InMemoryCache, createHttpLink, from, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { persistCacheSync, LocalStorageWrapper } from "apollo3-cache-persist";

const CACHE_PERSIST_KEY = "nexcom-apollo-cache";

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql",
});

const authLink = setContext((_, { headers }: { headers?: Record<string, string> }) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("nexcom_access_token") : null;
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === "UNAUTHENTICATED" && typeof window !== "undefined") {
        localStorage.removeItem("nexcom_access_token");
        localStorage.removeItem("nexcom_refresh_token");
        localStorage.removeItem(CACHE_PERSIST_KEY);
        window.location.href = "/login";
      }
      console.error(`[GraphQL Error] ${err.message}`);
    }
  }
  if (networkError) console.error(`[Network Error] ${networkError}`);
});

const httpChain = from([errorLink, authLink, httpLink]);

function getWsUrl() {
  if (process.env.NEXT_PUBLIC_GRAPHQL_WS_URL) return process.env.NEXT_PUBLIC_GRAPHQL_WS_URL;
  const httpUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";
  return httpUrl.replace(/^http/, "ws");
}

const link =
  typeof window !== "undefined"
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" && definition.operation === "subscription"
          );
        },
        new GraphQLWsLink(
          createClient({
            url: getWsUrl(),
            connectionParams: () => {
              const token = localStorage.getItem("nexcom_access_token");
              return token ? { authorization: `Bearer ${token}` } : {};
            },
          }),
        ),
        httpChain,
      )
    : httpChain;

const cache = new InMemoryCache();

// Persistencia offline: restaura la última data conocida (saldo, pedidos,
// billetera) de localStorage de forma síncrona al cargar, para que la app
// "Recoge NexCom" muestre información aunque no haya red. Guarda tras cada
// escritura del cache. Solo en el navegador.
if (typeof window !== "undefined") {
  try {
    persistCacheSync({
      cache,
      storage: new LocalStorageWrapper(window.localStorage),
      key: CACHE_PERSIST_KEY,
      maxSize: 2_000_000, // ~2MB, suficiente para saldo/pedidos
    });
  } catch (e) {
    console.warn("[apollo] no se pudo restaurar el cache persistido", e);
  }
}

/** Borra el cache persistido en localStorage (usar al cerrar sesión). */
export function purgePersistedCache() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CACHE_PERSIST_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const apolloClient = new ApolloClient({
  link,
  cache,
});
