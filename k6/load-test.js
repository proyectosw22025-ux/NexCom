import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

/**
 * Prueba de carga NexCom — distribución de tráfico 40/30/20/10
 *   40% — Catálogo (listar productos)        ← lectura pública, el caso más frecuente
 *   30% — Detalle de producto
 *   20% — Búsqueda por término
 *   10% — Login (mutación de auth)
 *
 * Criterio de aceptación (plan 5.7): 100 VUs concurrentes, P95 < 3s, error < 1%.
 *
 * Uso:
 *   k6 run k6/load-test.js                                  # contra localhost:4000
 *   k6 run -e BASE_URL=https://<host>/graphql k6/load-test.js
 *   k6 run -e LOAD_EMAIL=comprador@correo -e LOAD_PASSWORD=… k6/load-test.js
 */

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000/graphql";
const EMAIL    = __ENV.LOAD_EMAIL || "comprador@nexcom.bo";
const PASSWORD = __ENV.LOAD_PASSWORD || "Password123";

// Métrica propia: errores de negocio (GraphQL `errors`) además de los HTTP
const gqlErrors = new Rate("graphql_errors");

export const options = {
  scenarios: {
    trafico_mixto: {
      executor:        "ramping-vus",
      startVUs:        0,
      stages: [
        { duration: "30s", target: 100 }, // rampa de subida
        { duration: "1m",  target: 100 }, // sostener 100 VUs concurrentes
        { duration: "20s", target: 0 },   // rampa de bajada
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"], // P95 < 3s
    http_req_failed:   ["rate<0.01"],  // < 1% de fallos HTTP
    graphql_errors:    ["rate<0.01"],  // < 1% de errores GraphQL
  },
};

function graphql(query, variables) {
  const res = http.post(
    BASE_URL,
    JSON.stringify({ query, variables }),
    { headers: { "Content-Type": "application/json" } },
  );
  const ok = check(res, { "status 200": (r) => r.status === 200 });
  let body = {};
  try { body = res.json(); } catch (_) { /* respuesta no-JSON */ }
  gqlErrors.add(Boolean(body && body.errors));
  return { res, body, ok };
}

const Q_CATALOGO = `
  query ($limite: Int) {
    productos(limite: $limite, soloActivos: true) {
      items { id nombre precio }
      total
    }
  }`;

const Q_DETALLE = `
  query ($id: ID!) {
    producto(id: $id) { id nombre precio stock }
  }`;

const Q_BUSCAR = `
  query ($termino: String!) {
    buscar(termino: $termino, limite: 12) { total items { id nombre } }
  }`;

const M_LOGIN = `
  mutation ($email: String!, $password: String!) {
    login(email: $email, password: $password) { accessToken }
  }`;

const TERMINOS = ["camisa", "telefono", "zapato", "mesa", "cafe", "mochila"];

// setup() corre una vez: obtiene IDs reales para el escenario de detalle
export function setup() {
  const { body } = graphql(Q_CATALOGO, { limite: 20 });
  const ids = body?.data?.productos?.items?.map((p) => p.id) ?? [];
  return { ids };
}

export default function (data) {
  const dado = Math.random();

  if (dado < 0.4) {
    // 40% — catálogo
    graphql(Q_CATALOGO, { limite: 12 });
  } else if (dado < 0.7) {
    // 30% — detalle (usa un id real si setup encontró alguno)
    const ids = data.ids || [];
    if (ids.length > 0) {
      graphql(Q_DETALLE, { id: ids[Math.floor(Math.random() * ids.length)] });
    } else {
      graphql(Q_CATALOGO, { limite: 12 });
    }
  } else if (dado < 0.9) {
    // 20% — búsqueda
    graphql(Q_BUSCAR, { termino: TERMINOS[Math.floor(Math.random() * TERMINOS.length)] });
  } else {
    // 10% — login
    graphql(M_LOGIN, { email: EMAIL, password: PASSWORD });
  }

  sleep(Math.random() * 2 + 1); // 1-3s de "think time" por usuario virtual
}
