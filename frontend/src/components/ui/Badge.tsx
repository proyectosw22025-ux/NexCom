type BadgeVariant =
  | "pendiente" | "pagado" | "preparacion" | "enviado"
  | "entregado" | "completado" | "cancelado"
  | "activo" | "inactivo" | "destacado"
  | "stock-ok" | "stock-bajo" | "sin-stock"
  | "admin" | "vendedor" | "comprador";

const variantStyles: Record<BadgeVariant, string> = {
  pendiente:    "bg-amber-50   text-amber-700   border-amber-200",
  pagado:       "bg-sky-50     text-sky-700     border-sky-200",
  preparacion:  "bg-violet-50  text-violet-700  border-violet-200",
  enviado:      "bg-blue-50    text-blue-700    border-blue-200",
  entregado:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  completado:   "bg-green-50   text-green-700   border-green-200",
  cancelado:    "bg-red-50     text-red-600     border-red-200",
  activo:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactivo:     "bg-slate-100  text-slate-500   border-slate-200",
  destacado:    "bg-amber-50   text-amber-700   border-amber-200",
  "stock-ok":   "bg-emerald-50 text-emerald-700 border-emerald-200",
  "stock-bajo": "bg-amber-50   text-amber-700   border-amber-200",
  "sin-stock":  "bg-red-50     text-red-600     border-red-200",
  admin:        "bg-slate-800  text-white        border-slate-700",
  vendedor:     "bg-violet-100 text-violet-700  border-violet-200",
  comprador:    "bg-indigo-50  text-indigo-700  border-indigo-200",
};

const variantLabels: Record<BadgeVariant, string> = {
  pendiente:    "Pendiente",
  pagado:       "Pagado",
  preparacion:  "En preparación",
  enviado:      "Enviado",
  entregado:    "Entregado",
  completado:   "Completado",
  cancelado:    "Cancelado",
  activo:       "Activo",
  inactivo:     "Inactivo",
  destacado:    "Destacado",
  "stock-ok":   "En stock",
  "stock-bajo": "Stock bajo",
  "sin-stock":  "Agotado",
  admin:        "Admin",
  vendedor:     "Vendedor",
  comprador:    "Comprador",
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  dot?: boolean;
  size?: "sm" | "md";
}

export function Badge({ variant, label, dot = false, size = "md" }: BadgeProps) {
  const sizeClass = size === "sm"
    ? "text-[10px] px-1.5 py-0.5"
    : "text-xs font-semibold px-2.5 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${sizeClass} ${variantStyles[variant]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />}
      {label ?? variantLabels[variant]}
    </span>
  );
}
