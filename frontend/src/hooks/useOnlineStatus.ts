"use client";

import { useEffect, useState } from "react";

/**
 * Estado de conexión del navegador. Empieza en `true` (evita parpadeo en SSR)
 * y se sincroniza con navigator.onLine + eventos online/offline en el cliente.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
