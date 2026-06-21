import Link from "next/link";
import { ShoppingBag, Store, ShieldCheck, MapPin, QrCode, Gift, ArrowRight } from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Para compradores",
    desc:  "Productos locales verificados, pago boliviano (QR, transferencia o contra entrega) y puntos en cada compra.",
    color: "bg-indigo-50 text-indigo-600",
    accent: "bg-indigo-500",
  },
  {
    icon: Store,
    title: "Para vendedores",
    desc:  "Publica tu catálogo, cobra con QR o transferencia, gestiona tus envíos y recibe tus liquidaciones.",
    color: "bg-violet-50 text-violet-600",
    accent: "bg-violet-500",
  },
  {
    icon: ShieldCheck,
    title: "Confianza local",
    desc:  "Microempresas verificadas, valoraciones reales, facturación con NIT y devoluciones protegidas.",
    color: "bg-emerald-50 text-emerald-600",
    accent: "bg-emerald-500",
  },
];

const stats = [
  { value: "100%", label: "Pago en bolivianos" },
  { value: "QR", label: "Transferencia y efectivo" },
  { value: "9", label: "Departamentos" },
];

const beneficios = [
  { icon: QrCode, label: "QR Simple" },
  { icon: Gift, label: "Puntos NexCom" },
  { icon: MapPin, label: "Envíos por zona" },
  { icon: ShieldCheck, label: "Tiendas verificadas" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
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
            <Link href="/productos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Explorar
            </Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
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
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Fondo con degradado de marca */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50" />
        <div className="pointer-events-none absolute top-0 left-1/4 w-72 h-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-20 right-1/4 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="relative animate-fade-in">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600
                           bg-white border border-indigo-100 px-4 py-1.5 rounded-full mb-8 shadow-sm shadow-indigo-100">
            <MapPin className="h-3.5 w-3.5" />
            Marketplace boliviano para microempresas
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 max-w-2xl leading-[1.08] mx-auto">
            El marketplace<br />
            <span className="text-gradient">que conecta Bolivia</span>
          </h1>
          <p className="text-base text-slate-500 leading-relaxed max-w-xl mx-auto mb-10">
            Compra y vende con microempresas locales: pago en bolivianos (QR, transferencia o contra entrega),
            envíos por zona y recompensas en cada compra.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/productos"
              className="sheen inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-md shadow-indigo-200"
            >
              Explorar productos <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/registro"
              className="border border-slate-200 bg-white text-slate-700 font-semibold px-8 py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Crear cuenta gratis
            </Link>
          </div>

          {/* Chips de beneficios */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
            {beneficios.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                <Icon className="h-3.5 w-3.5 text-indigo-500" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200 py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-stretch">
          {stats.map(({ value, label }, i) => (
            <div key={label} className="flex-1 text-center px-4 py-2 relative">
              {i > 0 && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-px bg-slate-100" />}
              <p className="text-2xl font-extrabold text-gradient">{value}</p>
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
          {features.map(({ icon: Icon, title, desc, color, accent }, i) => (
            <div
              key={title}
              style={{ animationDelay: `${i * 80}ms` }}
              className="animate-stagger-fade-up hover-lift bg-white rounded-2xl border border-slate-200 p-6 overflow-hidden relative group"
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent} transition-all duration-300 group-hover:h-1`} />
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-16 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-10 text-center">
          <div className="pointer-events-none absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-2xl font-extrabold text-white mb-2">¿Listo para empezar?</h2>
          <p className="relative text-sm text-white/85 mb-6 max-w-md mx-auto">
            Crea tu cuenta gratis y empieza a comprar o a vender en minutos.
          </p>
          <Link
            href="/registro"
            className="relative inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-7 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Crear cuenta gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-700">NexCom</span>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} NexCom — Marketplace local boliviano para microempresas</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/productos" className="hover:text-slate-600 transition-colors">Productos</Link>
            <Link href="/login" className="hover:text-slate-600 transition-colors">Ingresar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
