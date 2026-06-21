"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value:    number;
  duration?: number;   // ms
  prefix?:  string;
  suffix?:  string;
  decimals?: number;
}

/** Anima un número desde 0 hasta `value` al montar (carga percibida premium). */
export function CountUp({ value, duration = 900, prefix = "", suffix = "", decimals = 0 }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const animar = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animar);
    };
    rafRef.current = requestAnimationFrame(animar);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formateado = display.toLocaleString("es-BO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span>{prefix}{formateado}{suffix}</span>;
}
