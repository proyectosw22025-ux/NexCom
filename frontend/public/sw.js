/* Service worker de "Recoge NexCom" (PWA offline).
 * Cachea el app-shell y los estáticos del mismo origen. NO toca las peticiones
 * GraphQL (POST hacia el backend en otro origen) — los datos offline los maneja
 * la caché persistente de Apollo (IndexedDB), no el service worker. */
const CACHE = "recoge-v1";
const APP_SHELL = ["/recoge"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;                       // no cachear mutaciones/POST
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // solo mismo origen (no API/Cloudinary)

  // Navegaciones: network-first con fallback a caché (permite abrir la app offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("/recoge"))),
    );
    return;
  }

  // Estáticos (JS/CSS/íconos): cache-first con relleno en segundo plano
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached),
    ),
  );
});
