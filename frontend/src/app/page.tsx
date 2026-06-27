import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Store, ShieldCheck, MapPin, QrCode, Gift, ArrowRight } from "lucide-react";
import { HERO_IMG, imagenCategoria, CATEGORIAS_DESTACADAS } from "@/lib/marketplace-images";

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
      <section className="relative overflow-hidden">
        {/* Fondo vivo: degradado animado + blobs orbitales */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 animate-gradient" />
        <div className="pointer-events-none absolute top-10 -left-12 w-80 h-80 rounded-full bg-indigo-300/30 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-violet-300/30 blur-3xl animate-blob" style={{ animationDelay: "-5s" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Columna texto */}
          <div className="animate-fade-in text-center lg:text-left">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600
                             bg-white border border-indigo-100 px-4 py-1.5 rounded-full mb-7 shadow-sm shadow-indigo-100">
              <MapPin className="h-3.5 w-3.5" />
              Marketplace boliviano para microempresas
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 leading-[1.08]">
              El marketplace<br />
              <span className="text-gradient">que conecta Bolivia</span>
            </h1>
            <p className="text-base text-slate-500 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9">
              Compra y vende con microempresas locales: pago en bolivianos (QR, transferencia o contra entrega),
              envíos por zona y <strong className="text-slate-700">Compra Protegida</strong> en cada pedido.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
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
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-9">
              {beneficios.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                  <Icon className="h-3.5 w-3.5 text-indigo-500" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Columna imagen con profundidad 3D + capas flotantes */}
          <div className="relative hidden lg:block animate-reveal-zoom" style={{ perspective: "1200px" }}>
            <div
              className="relative rounded-[1.75rem] overflow-hidden shadow-2xl shadow-indigo-300/40 border-4 border-white"
              style={{ transform: "rotateY(-9deg) rotateX(4deg)" }}
            >
              <Image
                src={HERO_IMG} alt="Compras en NexCom" width={680} height={520} priority
                className="object-cover w-full h-[460px]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-900/25 to-transparent" />
            </div>

            {/* Tarjeta flotante: Compra Protegida */}
            <div className="absolute -left-6 top-12 bg-white rounded-2xl shadow-xl shadow-slate-300/40 p-3 flex items-center gap-2.5 animate-float-y">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Compra Protegida</p>
                <p className="text-[10px] text-slate-400">Pago retenido hasta la entrega</p>
              </div>
            </div>

            {/* Tarjeta flotante: puntos */}
            <div className="absolute -right-5 bottom-14 bg-white rounded-2xl shadow-xl shadow-slate-300/40 p-3 flex items-center gap-2.5 animate-float-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">+1.420 pts</p>
                <p className="text-[10px] text-slate-400">Recompensas NexCom</p>
              </div>
            </div>

            {/* Pastilla flotante: métodos de pago */}
            <div className="absolute right-10 -top-4 bg-white rounded-xl shadow-lg px-3 py-1.5 animate-float-y" style={{ animationDelay: "-2.5s" }}>
              <p className="text-[11px] font-bold text-slate-700">QR · Transferencia · Efectivo</p>
            </div>
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

      {/* ── Categorías con imagen ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Explora por categoría</h2>
            <p className="text-sm text-slate-500 mt-1">Todo lo que vende Bolivia, en un solo lugar</p>
          </div>
          <Link href="/productos" className="link-underline text-sm font-semibold text-indigo-600 hidden sm:inline">
            Ver todo
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIAS_DESTACADAS.map((c, i) => (
            <Link
              key={c.slug}
              href="/productos"
              style={{ animationDelay: `${i * 70}ms` }}
              className="animate-stagger-fade-up hover-lift group relative rounded-2xl overflow-hidden aspect-[4/5] border border-slate-200 shadow-sm"
            >
              <Image
                src={imagenCategoria(c.slug)} alt={c.nombre} fill sizes="(max-width:640px) 50vw, 20vw"
                className="object-cover group-hover:scale-110 transition-transform duration-[600ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span className="text-2xl drop-shadow">{c.emoji}</span>
                <p className="text-white font-bold text-sm leading-tight mt-0.5">{c.nombre}</p>
              </div>
            </Link>
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
