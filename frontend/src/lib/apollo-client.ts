import { ApolloClient, InMemoryCache, createHttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

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
        window.location.href = "/login";
      }
      console.error(`[GraphQL Error] ${err.message}`);
    }
  }
  if (networkError) console.error(`[Network Error] ${networkError}`);
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
