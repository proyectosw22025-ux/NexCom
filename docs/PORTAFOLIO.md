# NexCom — Marketplace boliviano para microempresas · Full-stack

## Qué hace / problema que resuelve
Marketplace web que conecta a microempresas de Santa Cruz (Bolivia) con sus clientes, resolviendo la falta de confianza del comercio electrónico local: cada pedido se paga en bolivianos (QR, transferencia o contra entrega) bajo **Compra Protegida** — el dinero queda retenido en garantía (escrow) y solo se libera al vendedor cuando el cliente confirma la recepción **escaneando un QR físico del paquete con OTP rotativo**. Incluye tres paneles por rol (cliente, vendedor, administrador), billetera de reembolsos, sistema de devoluciones y disputas con mediación y auto-resolución, verificación KYC de vendedores, ofertas/cupones/puntos de fidelidad, mensajería y notificaciones en vivo, y una app móvil instalable (**"Recoge NexCom"**, PWA/APK) para recoger pedidos y consultar el saldo **con y sin conexión**.

## Mi rol
Desarrollo full-stack en un equipo académico bajo SCRUM (5 sprints): modelo de datos (40 tablas), API GraphQL y lógica de negocio en el backend, interfaz responsive en el frontend, arquitectura en tiempo real (WebSockets), suite de pruebas automatizadas y despliegue en la nube (Railway + Vercel + Neon).

## Logros técnicos
- **Escrow con integridad financiera real**: ledgers append-only idempotentes, transiciones de estado por CAS (compare-and-set), locks consultivos de PostgreSQL por usuario y decremento de stock atómico condicional — sin sobreventa ni dobles reembolsos bajo concurrencia.
- **Confirmación de entrega en dos factores**: QR físico del paquete + OTP temporal (CSPRNG) con bloqueo anti–fuerza bruta; la liberación del pago es idempotente y auditada.
- **Ciclo de vida autónomo**: crons con lock distribuido (una sola instancia ejecuta) que auto-cancelan pedidos no enviados con reembolso al cliente, liberan garantías vencidas, resuelven devoluciones y disputas ignoradas, y asientan saldos (ventana de asentamiento de 7 días antes de poder retirar).
- **Split de checkout multi-tienda**: una orden por vendedor con comisión por plan (FREE 10 % / PRO 5 %), cupones con reclamo de cupo atómico, canje de puntos y pago parcial con billetera — todo el dinero calculado server-side con `decimal.js`.
- **Tiempo real**: notificaciones push por GraphQL Subscriptions sobre WebSocket, respaldadas por Redis Pub/Sub para escalar horizontalmente; degradación elegante si Redis no está disponible.
- **PWA offline-first empaquetada como APK Android** (Trusted Web Activity con Digital Asset Links): caché de Apollo persistida para consultar saldo y pedidos sin red.
- **KYC con documentos privados**: subida firmada a Cloudinary en modo autenticado y URLs firmadas con expiración — los documentos nunca son públicos.
- **221 pruebas automatizadas** (Vitest, backend + frontend) cubriendo dinero, concurrencia, guards y componentes; auditoría de seguridad por capas (auth con refresh tokens rotativos hasheados, IDOR, validación de inputs, firma de webhooks).
- Sistema **desplegado en producción** y verificado extremo a extremo, con manual de usuario web publicado.

## Tecnologías
Next.js 15 · React 19 · TypeScript · Apollo Client · Tailwind CSS 4 · Fastify · GraphQL Yoga · Prisma 7 · PostgreSQL (Neon) · Redis · BullMQ · graphql-ws · decimal.js · Stripe · Cloudinary · Sentry · Vitest · PWA/TWA · Railway · Vercel

## Enlaces
- 🔗 Demo: https://nex-com-eight.vercel.app
- 💻 GitHub: https://github.com/proyectosw22025-ux/NexCom
- ⚙️ API GraphQL: https://diplomatic-cat-production.up.railway.app/graphql
- 📖 Manual de usuario: https://nex-com-eight.vercel.app/manual.html

---

## Capturas sugeridas (4)

| # | Pantalla | Ruta | Por qué esta |
|---|---|---|---|
| 1 | **Catálogo público** — hero + grilla de productos con precios en Bs., ofertas y buscador | `/productos` | Primera impresión: se ve como un marketplace real (estilo MercadoLibre), no como un proyecto de clase. |
| 2 | **Recojo por QR (Compra Protegida)** — pantalla del cliente con el OTP generado y el paso de escaneo del paquete | `/cliente/ordenes/[id]` → "Recoger pedido" | Es el diferenciador del proyecto: escrow + verificación en dos factores. Nadie más muestra esto. |
| 3 | **Saldo del vendedor** — tarjetas de retirable / en asentamiento / en garantía + movimientos y retiro | `/vendedor/saldo` | Demuestra la lógica financiera (fintech): comisiones, escrow y ventanas de asentamiento. |
| 4 | **App "Recoge NexCom" instalada en el teléfono** — pantalla de inicio con bottom-nav, idealmente con el aviso "Sin conexión" visible | APK / `/recoge` | Cierra la historia móvil: PWA → APK real funcionando offline. Foto del teléfono físico o mockup. |

**Consejos de captura:** usa datos del seed (tiendas y productos con nombres reales, montos en Bs. creíbles, nunca vacíos); navegador a 1440 px sin barra de favoritos; para la #4, foto del teléfono real con la app abierta o un mockup de dispositivo; difumina correos reales si aparecen. Si solo puedes usar 3, descarta la #3.

---

## Versión corta (tarjeta de portafolio)

**NexCom — Marketplace boliviano con Compra Protegida · Full-stack**
Marketplace multi-tienda para microempresas de Bolivia: pagos en bolivianos con escrow, liberación del pago por QR + OTP al recibir el pedido, billetera de reembolsos, devoluciones y disputas con auto-resolución, KYC de vendedores y notificaciones en tiempo real (WebSocket + Redis Pub/Sub). Incluye app móvil instalable (PWA → APK) que funciona sin conexión. 40 tablas, 221 tests automatizados, integridad financiera bajo concurrencia (CAS + locks + ledgers idempotentes).
**Rol:** desarrollo full-stack (backend, frontend, base de datos, tiempo real y despliegue).
**Stack:** Next.js, React, TypeScript, GraphQL, Prisma, PostgreSQL, Redis, Docker-ready, Railway/Vercel.
