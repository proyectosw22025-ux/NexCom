import type { ReactNode } from "react";
import { ShoppingBag } from "lucide-react";

const features = [
  "Más de 500 vendedores locales verificados",
  "Pagos seguros con Stripe — protección garantizada",
  "Entrega y seguimiento en tiempo real",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — branding ─────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[460px] xl:w-[520px] flex-shrink-0 flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-6 w-40 h-40 rounded-full bg-violet-500/20" />
        <div className="absolute top-1/4 left-1/3 w-24 h-24 rounded-full bg-indigo-400/20" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">NexCom</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            El marketplace<br />de Santa Cruz,<br />Bolivia
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed mb-8">
            Conectamos compradores y vendedores locales de forma segura, moderna y accesible.
          </p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-indigo-100 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-indigo-300/70 text-xs">© 2026 NexCom — v0.1.0</p>
        </div>
      </aside>

      {/* ── Right panel — form ─────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-50">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 pb-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="text-indigo-600 font-bold text-lg tracking-tight">NexCom</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
