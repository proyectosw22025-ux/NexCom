"use client";

import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./apollo-client";
import type { ReactNode } from "react";

export function ApolloClientProvider({ children }: { children: ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
