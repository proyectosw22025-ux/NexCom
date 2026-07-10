"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la PWA "Recoge NexCom". Se monta dentro del
 * layout de /recoge, así el SW solo se activa cuando se usa la app. Silencioso
 * si el navegador no soporta service workers.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* sin PWA si falla */ });
  }, []);
  return null;
}
