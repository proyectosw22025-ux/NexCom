# Cómo levantar NexCom desde cero

## Opción 1 — Todo con un comando (recomendado)

Requisito único: **Docker Desktop** instalado y corriendo.

```bash
git clone https://github.com/proyectosw22025-ux/NexCom.git
cd NexCom
docker compose -f docker-compose.demo.yml up --build
```

Eso levanta Postgres + Redis + backend + frontend, aplica las 25 migraciones y
**siembra la demo completa** (5 tiendas, 27 productos con foto, ofertas,
cupones, 14 clientes y ~75 días de ventas para los reportes del admin).

La primera vez tarda unos minutos (compila las imágenes). Cuando termine:

| | |
|---|---|
| Tienda | http://localhost:3000 |
| API GraphQL | http://localhost:4000/graphql |
| Manual de usuario | http://localhost:3000/manual.html |
| App "Recoge NexCom" | http://localhost:3000/recoge |

**Accesos de demo** (contraseña de todos: `Demo1234!`)

| Rol | Correo |
|---|---|
| Admin | `admin@nexcom.bo` |
| Vendedor | `tecnobolivia@demo.bo` (o `modaandina@demo.bo`, `saboresvalle@demo.bo`…) |
| Cliente | `cliente1@demo.bo` … `cliente14@demo.bo` |

Para detenerlo: `Ctrl+C`, y para borrar también los datos:

```bash
docker compose -f docker-compose.demo.yml down -v
```

> Las fotos de producto se sirven desde Unsplash: con internet el catálogo se ve
> completo. Sin internet la app funciona igual, solo sin esas imágenes.

---

## Opción 2 — Desarrollo con hot-reload

Infra en Docker, apps nativas (recarga instantánea al editar código):

```bash
docker compose up -d                 # solo Postgres + Redis

cd backend
cp .env.example .env                 # ajustar DATABASE_URL y REDIS_URL a localhost
npm install
npm run db:migrate
npm run db:seed && npx tsx src/scripts/seed-actividad.ts
npm run dev                          # http://localhost:4000/graphql

cd ../frontend
npm install
npm run dev                          # http://localhost:3000
```

Para desarrollo local, en `backend/.env`:

```
DATABASE_URL=postgresql://nexcom:nexcom@localhost:5432/nexcom
REDIS_URL=redis://localhost:6379
```

⚠️ **Nunca apuntes el `.env` local a la base de producción.** Un
`npm run db:migrate:reset` borra toda la base a la que apunte.

---

## Producción (referencia)

| Componente | Dónde vive |
|---|---|
| Frontend | Vercel → https://nex-com-eight.vercel.app |
| Backend + PostgreSQL + Redis | Railway (proyecto `fabulous-perfection`) |
| Imágenes subidas por usuarios | Cloudinary |

El backend arranca con `scripts/start.cjs`, que aplica las migraciones
pendientes (con reintentos) antes de servir. Las variables reales viven en el
panel de Railway; `backend/.env.example` lista todas las necesarias.
