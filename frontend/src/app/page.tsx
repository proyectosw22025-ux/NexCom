import Link from "next/link";
import { ShoppingBag, Store, Shield, MapPin } from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Para compradores",
    desc:  "Encuentra productos locales verificados y paga de forma segura con Stripe.",
    color: "bg-indigo-50 text-indigo-600",
    accent: "bg-indigo-500",
  },
  {
    icon: Store,
    title: "Para vendedores",
    desc:  "Publica tu catálogo, gestiona órdenes y llega a miles de compradores locales.",
    color: "bg-violet-50 text-violet-600",
    accent: "bg-violet-500",
  },
  {
    icon: Shield,
    title: "Pagos seguros",
    desc:  "Procesamiento con Stripe, reseñas verificadas y soporte ante disputas.",
    color: "bg-emerald-50 text-emerald-600",
    accent: "bg-emerald-500",
  },
];

const stats = [
  { value: "500+", label: "Vendedores activos" },
  { value: "12K+", label: "Productos publicados" },
  { value: "4.8",  label: "Rating promedio" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight">
              Nex<span className="text-indigo-600">Com</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl transition-colors shadow-sm shadow-indigo-200"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-b from-white to-slate-50">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600
                         bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-8
                         shadow-sm shadow-indigo-100">
          <MapPin className="h-3.5 w-3.5" />
          Santa Cruz de la Sierra, Bolivia
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        </span>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 max-w-2xl leading-[1.08]">
          El marketplace<br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            que conecta Bolivia
          </span>
        </h1>
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="h-px w-8 bg-slate-200 shrink-0" />
          <p className="text-base text-slate-500 leading-relaxed">
            Compradores y vendedores de Santa Cruz en una sola plataforma segura, moderna y fácil de usar.
          </p>
          <div className="h-px w-8 bg-slate-200 shrink-0" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/registro"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-md shadow-indigo-200"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="border border-slate-200 bg-white text-slate-700 font-semibold px-8 py-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200 py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-stretch">
          {stats.map(({ value, label }, i) => (
            <div key={label} className="flex-1 text-center px-6 py-2 relative">
              {i > 0 && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-px bg-slate-100" />
              )}
              <p className="text-2xl font-extrabold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¿Por qué NexCom?</h2>
          <p className="text-sm text-slate-500">Diseñado para el comercio local boliviano</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, color, accent }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-200 p-6 overflow-hidden relative
                         hover:shadow-md hover:shadow-slate-200/60 transition-all duration-200 group"
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent} transition-all duration-300 group-hover:h-1`} />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-6 text-center">
        <p className="text-xs text-slate-400">© 2026 NexCom — Marketplace local boliviano · v0.1.0</p>
      </footer>
    </div>
  );
}
