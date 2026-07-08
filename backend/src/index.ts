import "./shared/dns-ipv4.js"; // fuerza IPv4 primero (debe ir ANTES de cualquier otro import)
import "dotenv/config";
import Fastify from "fastify";
import { createYoga } from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import Stripe from "stripe";

import { env } from "./config/env.js";
import { corsPlugin } from "./plugins/cors.plugin.js";
import helmet from "@fastify/helmet";
import { rateLimitPlugin } from "./plugins/rate-limit.plugin.js";
import { ofertasRepository } from "./modules/ofertas/ofertas.repository.js";
import { ordenesService } from "./modules/ordenes/ordenes.service.js";
import { schema as typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
import prisma from "./shared/prisma.client.js";
import redis from "./shared/redis.client.js";
import { extractBearerToken, verifyAccessToken } from "./shared/jwt.util.js";
import { publishNotificacion } from "./shared/pubsub.js";
import { saldosService } from "./modules/saldos/saldos.service.js";
import { fidelidadService } from "./modules/fidelidad/fidelidad.service.js";
import { generarCodigoEntrega } from "./shared/codigo-entrega.util.js";
import { Decimal } from "decimal.js";
import { startEmailWorker } from "./shared/email.worker.js";
import { runWithLock } from "./shared/lock.util.js";
import { registrarOperacion } from "./shared/metrics.js";
import { initSentry, captureError, esErrorInesperado } from "./shared/sentry.js";
import type { NexComContext, UsuarioJWT } from "./shared/types/context.type.js";

interface WSExtra {
  user?: UsuarioJWT | null;
  [key: string | symbol]: unknown;
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
  maxNetworkRetries: 3, // resiste baches transitorios de red hacia Stripe
  timeout: 20_000,
  // La resolución IPv4 se fuerza globalmente en ./shared/dns-ipv4 (evita el
  // fallo de ruta IPv6 en Railway sin acoplar un httpAgent custom al SDK).
});

async function bootstrap() {
  initSentry(); // error tracking (inerte si no hay SENTRY_DSN)

  // Logging estructurado (Pino) con request-id automático por petición.
  // En producción registra cada request (método, url, status, tiempo, reqId)
  // como JSON — base de observabilidad. En dev, nivel más verboso.
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  // Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.).
  // CSP desactivada: rompería GraphiQL y este backend solo sirve la API.
  await app.register(helmet, { contentSecurityPolicy: false });

  // Observa errores a nivel HTTP sin alterar la respuesta (los reporta a Sentry)
  app.addHook("onError", async (req, _reply, err) => {
    captureError(err, { url: req.url, method: req.method });
  });

  app.get("/health", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reply.send({ status: "ok", redis: redis.status });
    } catch {
      reply.status(503).send({ status: "error" });
    }
  });

  const executableSchema = makeExecutableSchema({ typeDefs, resolvers });

  // Plugin de observabilidad: mide la latencia de cada operación GraphQL
  const metricsPlugin = {
    onExecute({ args }: { args: { operationName?: string | null } }) {
      const inicio = Date.now();
      const operacion = args.operationName ?? "anónima";
      return {
        onExecuteDone({ result }: { result: unknown }) {
          const errors = (result as { errors?: Array<{ message: string; extensions?: { code?: unknown } }> })?.errors;
          registrarOperacion(operacion, Date.now() - inicio, Boolean(errors?.length));
          // Reporta a Sentry solo errores inesperados (no los de negocio/validación)
          errors?.filter(esErrorInesperado).forEach((e) =>
            captureError(e, { operacion, graphql: true }),
          );
        },
      };
    },
  };

  const yoga = createYoga<{ req: any; reply: any; extra?: WSExtra }>({
    schema:          executableSchema,
    graphiql:        env.NODE_ENV === "development",
    graphqlEndpoint: env.GRAPHQL_PATH,
    plugins:         [metricsPlugin],
    context: ({ req, extra }): NexComContext => {
      // Conexión WebSocket (subscriptions): el usuario ya fue resuelto en onConnect
      if (extra?.user !== undefined) {
        return { user: extra.user, ip: null, prisma, redis, stripe };
      }
      const headers = (req as any)?.headers as Record<string, string | undefined> | undefined;
      const authHeader = headers?.authorization;
      const token = extractBearerToken(authHeader);
      const user  = token ? verifyAccessToken(token) : null;
      // IP real del cliente: detrás de Railway/proxies viene en x-forwarded-for
      const ip = headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
        ?? ((req as any)?.ip as string | undefined)
        ?? null;
      return { user, ip, prisma, redis, stripe };
    },
  });

  // Fastify + graphql-yoga: convertir la Web Response a raw response
  app.route({
    url:    env.GRAPHQL_PATH,
    method: ["GET", "POST", "OPTIONS"],
    handler: async (req, reply) => {
      const response = await yoga.handleNodeRequestAndResponse(req, reply, { req, reply });

      for (const [key, value] of response.headers.entries()) {
        reply.header(key, value);
      }
      reply.status(response.status);

      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) chunks.push(result.value);
        }
        const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        reply.send(buffer);
      } else {
        reply.send(null);
      }
    },
  });

  // GraphQL Subscriptions sobre WebSocket (graphql-ws)
  const wsServer = new WebSocketServer({ server: app.server, path: env.GRAPHQL_PATH });

  useServer<Record<string, unknown>, WSExtra>(
    {
      schema: executableSchema,
      onConnect: (ctx) => {
        const authorization = ctx.connectionParams?.authorization as string | undefined;
        const token = extractBearerToken(authorization);
        const user  = token ? verifyAccessToken(token) : null;
        if (!user) return false;
        ctx.extra.user = user;
      },
      execute: (args: any) => args.rootValue.execute(args),
      subscribe: (args: any) => args.rootValue.subscribe(args),
      onSubscribe: async (ctx, _id, payload) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
          ...ctx,
          req: ctx.extra.request,
          socket: ctx.extra.socket,
          params: payload,
        });

        const args = {
          schema,
          operationName: payload.operationName,
          document: parse(payload.query),
          variableValues: payload.variables,
          contextValue: await contextFactory(),
          rootValue: { execute, subscribe },
        };

        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
        return args;
      },
    },
    wsServer,
  );

  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

    if (!sig || !rawBody) {
      reply.status(400).send({ error: "Firma o cuerpo faltante" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      reply.status(400).send({ error: "Firma inválida" });
      return;
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orden = await prisma.orden.findUnique({
          where:   { stripePaymentIntentId: intent.id },
          include: { pago: true, items: true, comprador: { include: { usuario: true } }, vendedor: { include: { usuario: true } } },
        });
        if (orden && orden.estado === "PENDIENTE_PAGO") {
          const notificacionesCreadas = await prisma.$transaction(async (tx) => {
            await tx.orden.update({ where: { id: orden.id }, data: { estado: "PAGADO" } });
            if (orden.pago) {
              const chargeId = (intent.latest_charge as string) ?? null;
              await tx.pago.update({
                where: { id: orden.pago!.id },
                data:  { estado: "COMPLETADO", stripeChargeId: chargeId },
              });
            }
            await tx.historialEstadoOrden.create({
              data: {
                ordenId:        orden.id,
                estadoAnterior: "PENDIENTE_PAGO",
                estadoNuevo:    "PAGADO",
                cambiadoPorId:  orden.compradorId,
                notas:          "Pago confirmado vía Stripe webhook",
              },
            });
            // Vaciar carrito
            const carrito = await tx.carrito.findUnique({ where: { compradorId: orden.compradorId } });
            if (carrito) {
              await tx.itemCarrito.deleteMany({ where: { carritoId: carrito.id } });
            }
            // Notificaciones (create individual para poder publicarlas vía pubsub tras el commit)
            const notifComprador = await tx.notificacion.create({
              data: {
                usuarioId: orden.comprador.usuarioId,
                ordenId:   orden.id,
                tipo:      "PAGO_CONFIRMADO",
                titulo:    "¡Pago confirmado!",
                mensaje:   `Tu orden #${orden.id.slice(-6).toUpperCase()} fue pagada exitosamente.`,
                url:       `/comprador/ordenes/${orden.id}`,
              },
            });
            const notifVendedor = await tx.notificacion.create({
              data: {
                usuarioId: orden.vendedor.usuarioId,
                ordenId:   orden.id,
                tipo:      "NUEVA_ORDEN",
                titulo:    "Nueva orden recibida",
                mensaje:   `Tienes una nueva orden #${orden.id.slice(-6).toUpperCase()}.`,
                url:       `/vendedor/ordenes/${orden.id}`,
              },
            });
            return [notifComprador, notifVendedor];
          });

          for (const notif of notificacionesCreadas) {
            publishNotificacion(notif.usuarioId, {
              id:       notif.id,
              tipo:     notif.tipo,
              titulo:   notif.titulo,
              mensaje:  notif.mensaje,
              leido:    notif.leido,
              url:      notif.url,
              ordenId:  notif.ordenId,
              creadoEn: notif.creadoEn.toISOString(),
            });
          }

          // Compra Protegida — mismo tratamiento que el camino simulado
          // (_confirmarOrden): el pago real también RETIENE en garantía, genera
          // el QR del paquete y acredita fidelidad. Todo idempotente por orden.
          await saldosService.registrarRetencion(
            orden.vendedorId, orden.id, orden.total.toString(), orden.vendedor.plan ?? "FREE", prisma,
          );
          if (!orden.codigoEntrega) {
            await prisma.orden.update({ where: { id: orden.id }, data: { codigoEntrega: generarCodigoEntrega() } });
          }
          if (orden.puntosUsados > 0) {
            await fidelidadService.registrarCanje(orden.compradorId, orden.id, orden.puntosUsados, prisma);
          }
          const gastoNeto = new Decimal(orden.subtotal.toString())
            .minus(orden.descuentoCupon.toString())
            .minus(orden.descuentoPuntos.toString());
          await fidelidadService.registrarGanados(orden.compradorId, orden.id, gastoNeto, prisma);
        }
      } else if (event.type === "payment_intent.payment_failed") {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orden = await prisma.orden.findUnique({
          where:   { stripePaymentIntentId: intent.id },
          include: { pago: true, items: true },
        });
        if (orden && orden.estado === "PENDIENTE_PAGO") {
          await prisma.$transaction(async (tx) => {
            await tx.orden.update({ where: { id: orden.id }, data: { estado: "CANCELADO" } });
            if (orden.pago) {
              await tx.pago.update({ where: { id: orden.pago!.id }, data: { estado: "FALLIDO" } });
            }
            // Restituir stock
            for (const it of orden.items) {
              await tx.producto.update({
                where: { id: it.productoId },
                data:  { stock: { increment: it.cantidad } },
              });
            }
            await tx.historialEstadoOrden.create({
              data: {
                ordenId:        orden.id,
                estadoAnterior: "PENDIENTE_PAGO",
                estadoNuevo:    "CANCELADO",
                cambiadoPorId:  orden.compradorId,
                notas:          "Pago fallido — stock restituido automáticamente",
              },
            });
          });
        }
      }
    } catch (err) {
      app.log.error({ err }, "Error procesando webhook de Stripe");
      captureError(err, { contexto: "stripe-webhook" });
    }

    reply.status(200).send({ received: true });
  });

  // Cron: actualizar estado de ofertas cada hora.
  // Con lock distribuido: aunque haya N instancias del backend, solo una corre
  // el job en cada ciclo (evita actualizaciones duplicadas al escalar horizontal).
  setInterval(
    () => runWithLock("cron:ofertas:estados", 55 * 60, () =>
      ofertasRepository.actualizarEstadosAutomaticos(prisma),
    ).catch(console.error),
    60 * 60 * 1000,
  );

  // Cron: barrido del escrow cada 15 min (auto-liberación, cancelación por
  // no-envío + reembolso, cierre de órdenes y vencimiento del plan PRO).
  // GARANTIZADO por reloj: antes estos procesos eran perezosos al listar
  // órdenes — si nadie abría la app, un reembolso podía no ejecutarse nunca.
  setInterval(
    () => runWithLock("cron:escrow:barrido", 14 * 60, () =>
      ordenesService.barridoEscrow(prisma),
    ).catch(console.error),
    15 * 60 * 1000,
  );
  // Primer barrido al arrancar (recupera lo pendiente tras un deploy/caída)
  runWithLock("cron:escrow:barrido", 14 * 60, () => ordenesService.barridoEscrow(prisma)).catch(console.error);

  // Redis: conexión no bloqueante — el servidor arranca aunque Redis no esté disponible
  redis.connect()
    .then(() => console.log("[Redis] Conectado en", env.REDIS_URL))
    .catch((err: Error) => console.warn("[Redis] No disponible — cache desactivado:", err.message));

  // Worker de la cola de emails (BullMQ): procesa envíos asíncronos con reintentos
  try {
    startEmailWorker();
  } catch (err) {
    console.warn("[EmailWorker] No se pudo iniciar:", (err as Error).message);
  }

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });

    console.log(`
╔══════════════════════════════════════════════════════╗
║           NEXCOM BACKEND — CORRIENDO                 ║
╠══════════════════════════════════════════════════════╣
║  GraphQL:    http://localhost:${env.PORT}${env.GRAPHQL_PATH}          ║
║  GraphiQL:   http://localhost:${env.PORT}${env.GRAPHQL_PATH}          ║
║  Entorno:    ${env.NODE_ENV}                              ║
╚══════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
