# ── NexCom Backend — Fastify + GraphQL Yoga + Prisma ────────────────────────
# Imagen base "slim" (Debian) en lugar de "alpine": evita problemas de
# binary targets de Prisma (el motor por defecto se compila para
# debian-openssl-3.0.x, no para musl/alpine).

# ── deps: instala dependencias (incluye devDeps, necesarias para build y prisma CLI) ──
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ── build: genera el cliente Prisma y compila TypeScript ────────────────────
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runner: imagen final que corre la API ────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./

EXPOSE 4000

# `npm start` aplica migraciones pendientes (prisma migrate deploy) antes de arrancar
CMD ["npm", "start"]
