import { MessageCircle } from "lucide-react";

/** Normaliza un teléfono boliviano a formato wa.me (con código país 591). */
function formatoBolivia(tel: string): string | null {
  const digits = tel.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("591")) return digits;
  if (digits.length === 8) return `591${digits}`; // celular boliviano (8 dígitos)
  return digits;
}

interface BotonWhatsAppProps {
  telefono?: string | null;
  mensaje:   string;
  label?:    string;
  className?: string;
}

/** Botón "Consultar por WhatsApp". No se renderiza si el vendedor no tiene teléfono. */
export function BotonWhatsApp({ telefono, mensaje, label = "Consultar por WhatsApp", className }: BotonWhatsAppProps) {
  const num = telefono ? formatoBolivia(telefono) : null;
  if (!num) return null;

  const href = `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-2.5 px-4 text-sm transition-colors shadow-sm shadow-emerald-200"
      }
    >
      <MessageCircle className="h-4 w-4" /> {label}
    </a>
  );
}
