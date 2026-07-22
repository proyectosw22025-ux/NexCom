/**
 * Lanzador de producción (Railway): `npm start` → node scripts/start.cjs
 *
 * Resuelve dos causas reales de crash-loop en el arranque:
 *  1. `prisma migrate deploy` es un proceso aparte que NO hereda el
 *     `dns.setDefaultResultOrder("ipv4first")` de la app (src/shared/dns-ipv4.ts);
 *     si la ruta IPv6 del host hacia Neon falla, muere con P1001 antes de
 *     arrancar. Aquí se fuerza IPv4 vía NODE_OPTIONS para TODOS los procesos.
 *  2. Neon (free tier) suspende el compute por inactividad y su despertar
 *     puede superar el connect-timeout de Prisma: se reintenta hasta 5 veces
 *     con espera creciente (5,10,15,20 s) antes de rendirse.
 */
const { spawnSync, spawn } = require("node:child_process");

const env = { ...process.env, NODE_OPTIONS: "--dns-result-order=ipv4first" };
const delay = (s) => new Promise((r) => setTimeout(r, s * 1000));

(async () => {
  let ok = false;
  for (let i = 1; i <= 5; i++) {
    const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env, shell: true });
    if (r.status === 0) { ok = true; break; }
    if (i < 5) {
      console.log(`[start] migrate deploy falló (intento ${i}/5) — la BD puede estar despertando; reintento en ${i * 5}s`);
      await delay(i * 5);
    }
  }
  if (!ok) {
    console.error("[start] migraciones fallaron tras 5 intentos — abortando (no se arranca sin esquema al día)");
    process.exit(1);
  }
  const app = spawn("node", ["dist/index.js"], { stdio: "inherit", env });
  app.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
})();
