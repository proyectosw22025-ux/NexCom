"use client";

import { Settings, Globe, Shield, Mail, CreditCard, Bell, ChevronRight } from "lucide-react";

const secciones = [
  {
    icon: Globe,
    titulo: "General",
    descripcion: "Nombre del marketplace, región, moneda y zona horaria.",
    estado: "Configurado",
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    icon: Shield,
    titulo: "Seguridad y roles",
    descripcion: "Políticas de contraseñas, 2FA y permisos por rol.",
    estado: "Sprint 5",
    color: "text-slate-400",
    bg:    "bg-slate-50",
  },
  {
    icon: Mail,
    titulo: "Correo electrónico",
    descripcion: "Servidor SMTP, plantillas de email y notificaciones automáticas.",
    estado: "Configurado (Mailtrap)",
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    icon: CreditCard,
    titulo: "Pagos / Stripe",
    descripcion: "Claves de API, webhooks y configuración de métodos de pago.",
    estado: "Configurado",
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    icon: Bell,
    titulo: "Notificaciones",
    descripcion: "Tipos de notificaciones activas y canales de entrega.",
    estado: "Sprint 5",
    color: "text-slate-400",
    bg:    "bg-slate-50",
  },
];

export default function AdminConfiguracionPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-400 mt-0.5">Parámetros globales del sistema NexCom</p>
      </div>

      {/* Config actual */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado actual del sistema</p>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { label: "Marketplace",  value: "NexCom Bolivia" },
            { label: "Moneda",       value: "BOB (Bolivianos)" },
            { label: "País",         value: "Bolivia" },
            { label: "Ciudad base",  value: "Santa Cruz de la Sierra" },
            { label: "Entorno",      value: "Desarrollo (test)" },
            { label: "Email SMTP",   value: "Mailtrap Sandbox" },
            { label: "Pagos",        value: "Stripe (modo test)" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-semibold text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Secciones de config */}
      <div className="space-y-3">
        {secciones.map(({ icon: Icon, titulo, descripcion, estado, color, bg }) => (
          <div
            key={titulo}
            className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{titulo}</p>
              <p className="text-xs text-slate-400 mt-0.5">{descripcion}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold ${color}`}>{estado}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-slate-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Nota</p>
        </div>
        <p className="text-sm text-slate-300">
          La configuración avanzada del sistema (reglas de negocio, comisiones por venta,
          moderación automática) estará disponible en el Sprint 5 con el módulo de administración completo.
        </p>
      </div>
    </div>
  );
}
