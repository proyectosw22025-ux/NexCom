/**
 * Fetch de GraphQL para **Server Components** (RSC/SSR).
 *
 * A diferencia del Apollo Client (que vive en el navegador con el token en
 * localStorage), esto corre en el servidor de Next y sirve para datos
 * **públicos** (catálogo, categorías, detalle de producto).
 *
 * Usa el método GET de GraphQL Yoga para que el resultado entre en el
 * **Data Cache de Next** (`next.revalidate`): así varias visitas comparten la
 * misma respuesta cacheada en el edge de Vercel sin volver a golpear el backend.
 * (El Data Cache de Next solo cachea GET, no POST.)
 */
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

interface GraphQLResponse<T> {
  data?:   T;
  errors?: { message: string }[];
}

export async function gqlFetchCacheable<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidateSeconds = 60,
): Promise<T> {
  const url = new URL(GRAPHQL_URL);
  url.searchParams.set("query", query);
  if (Object.keys(variables).length > 0) {
    url.searchParams.set("variables", JSON.stringify(variables));
  }

  const res = await fetch(url.toString(), {
    method:  "GET",
    headers: { "Content-Type": "application/json" },
    next:    { revalidate: revalidateSeconds },
  });

  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("Respuesta GraphQL vacía");
  return json.data;
}
