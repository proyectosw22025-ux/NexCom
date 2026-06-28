"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Modo = "claro" | "oscuro" | "auto";
export type Skin = "joven" | "adulto";
type Resuelto = "claro" | "oscuro";

interface UiPrefs {
  modo: Modo;
  skin: Skin;
  resuelto: Resuelto;          // tema efectivo tras resolver "auto"
  sidebarColapsado: boolean;
  setModo: (m: Modo) => void;
  setSkin: (s: Skin) => void;
  toggleSidebar: () => void;
}

const Ctx = createContext<UiPrefs | null>(null);

/** Resuelve "auto" según la hora local (noche 19:00–06:59). */
function resolver(modo: Modo): Resuelto {
  if (modo === "claro") return "claro";
  if (modo === "oscuro") return "oscuro";
  const h = new Date().getHours();
  return h >= 19 || h < 7 ? "oscuro" : "claro";
}

function aplicar(resuelto: Resuelto, skin: Skin) {
  const el = document.documentElement;
  el.setAttribute("data-theme", resuelto === "oscuro" ? "dark" : "light");
  el.setAttribute("data-skin", skin);
}

export function UiPrefsProvider({ children }: { children: React.ReactNode }) {
  const [modo, setModoState] = useState<Modo>("auto");
  const [skin, setSkinState] = useState<Skin>("joven");
  const [sidebarColapsado, setSidebar] = useState(false);
  const [resuelto, setResuelto] = useState<Resuelto>("claro");

  // Hidratar desde localStorage (tras montar; el script anti-flash ya pintó el tema)
  useEffect(() => {
    const m = (localStorage.getItem("nexcom-modo") as Modo) || "auto";
    const s = (localStorage.getItem("nexcom-skin") as Skin) || "joven";
    const sb = localStorage.getItem("nexcom-sidebar") === "1";
    setModoState(m); setSkinState(s); setSidebar(sb);
  }, []);

  // Aplicar + re-evaluar "auto" periódicamente
  useEffect(() => {
    const tick = () => { const r = resolver(modo); setResuelto(r); aplicar(r, skin); };
    tick();
    if (modo !== "auto") return;
    const id = setInterval(tick, 60 * 1000); // revisa cada minuto si cambió el horario
    return () => clearInterval(id);
  }, [modo, skin]);

  const setModo = useCallback((m: Modo) => { setModoState(m); localStorage.setItem("nexcom-modo", m); }, []);
  const setSkin = useCallback((s: Skin) => { setSkinState(s); localStorage.setItem("nexcom-skin", s); }, []);
  const toggleSidebar = useCallback(() => {
    setSidebar((v) => { const n = !v; localStorage.setItem("nexcom-sidebar", n ? "1" : "0"); return n; });
  }, []);

  return (
    <Ctx.Provider value={{ modo, skin, resuelto, sidebarColapsado, setModo, setSkin, toggleSidebar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUiPrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUiPrefs debe usarse dentro de UiPrefsProvider");
  return ctx;
}
