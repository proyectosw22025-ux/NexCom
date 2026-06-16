# Pruebas de carga — k6

Script de carga para validar el criterio de aceptación del Sprint 5:
**100 VUs concurrentes, P95 < 3 s, tasa de error < 1 %**.

## Requisitos

k6 es un binario independiente (no es un paquete npm). Instalación:

```bash
# Windows (winget)
winget install k6.k6
# macOS
brew install k6
# Linux (Debian/Ubuntu)
sudo apt-get install k6
```

## Cómo ejecutar

```bash
# Contra el backend local (arráncalo antes con: cd backend && npm run dev)
k6 run k6/load-test.js

# Contra un host desplegado
k6 run -e BASE_URL=https://<host>/graphql k6/load-test.js

# Con credenciales reales de un usuario sembrado (escenario de login)
k6 run -e LOAD_EMAIL=comprador@nexcom.bo -e LOAD_PASSWORD=Password123 k6/load-test.js
```

## Distribución del tráfico (40/30/20/10)

| Peso | Operación            | Tipo               |
|------|----------------------|--------------------|
| 40 % | Listar catálogo      | query pública      |
| 30 % | Detalle de producto  | query pública      |
| 20 % | Búsqueda por término | query pública      |
| 10 % | Login                | mutación de auth   |

El script incluye 1–3 s de *think time* por iteración para simular usuarios reales.

## Notas

- **Dónde ejecutarlo:** preferible en **local** o contra un entorno de *staging*. Correrlo
  contra el backend de Railway en plan Hobby puede tocar límites del plan y los recursos
  compartidos no reflejan la capacidad real de producción.
- El **rate limit** del backend es de 300 req/min por IP. Como k6 corre desde una sola IP,
  para una prueba de saturación real conviene desactivar temporalmente el límite o
  ejecutar desde varias máquinas/IPs; de lo contrario verás respuestas 429 esperadas.
- El umbral `graphql_errors` distingue errores de negocio (campo `errors` de GraphQL) de
  los fallos de red/HTTP (`http_req_failed`).
