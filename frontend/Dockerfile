# ── NexCom Frontend — Next.js 15 (App Router, output standalone) ───────────

# ── deps: instala dependencias ───────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci

# ── builder: compila la app Next.js ──────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables NEXT_PUBLIC_* se incrustan en el bundle del navegador en build-time
ARG NEXT_PUBLIC_GRAPHQL_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# ── runner: imagen final mínima (Next.js standalone) ─────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
