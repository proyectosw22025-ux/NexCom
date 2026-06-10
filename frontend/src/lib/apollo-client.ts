import { ApolloClient, InMemoryCache, createHttpLink, from, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

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

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
