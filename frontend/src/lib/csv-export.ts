/** Exporta filas a un CSV y dispara la descarga en el navegador (sin backend). */
export function exportarCSV(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenido = [encabezados, ...filas].map((fila) => fila.map(escapar).join(",")).join("\r\n");
  // BOM al inicio para que Excel detecte UTF-8 y muestre tildes/ñ correctamente.
  const BOM = "﻿";
  const blob = new Blob([BOM + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
