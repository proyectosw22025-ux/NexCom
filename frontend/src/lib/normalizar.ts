/**
 * Normaliza texto para búsquedas "inteligentes" del lado del cliente:
 * minúsculas + sin acentos/diacríticos, para que "camara" encuentre "Cámara"
 * y "platano" encuentre "Plátano". Útil en filtros locales de listas.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas combinantes
    .trim();
}

/** ¿`texto` contiene todos los términos de `consulta` (orden libre)? */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const t = normalizar(texto);
  return normalizar(consulta)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => t.includes(term));
}
