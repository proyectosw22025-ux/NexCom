import Link from "next/link";
import { Boxes, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-sm shadow-indigo-200 mb-6">
        <Boxes className="h-7 w-7 text-white" />
      </div>
      <p className="text-6xl font-extrabold text-slate-900 tracking-tight">404</p>
      <h1 className="text-xl font-bold text-slate-800 mt-2">Página no encontrada</h1>
      <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
        La página que buscas no existe o fue movida. Revisa la dirección o vuelve al inicio.
      </p>
      <div className="flex items-center gap-3 mt-7">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          <Home className="h-4 w-4" /> Ir al inicio
        </Link>
        <Link
          href="/productos"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 text-slate-700
                     text-sm font-semibold rounded-xl hover:bg-white transition-colors"
        >
          <Search className="h-4 w-4" /> Ver catálogo
        </Link>
      </div>
    </div>
  );
}
