"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";

type Accent = "indigo" | "violet" | "emerald" | "amber" | "sky" | "rose" | "slate";

const ACCENTS: Record<Accent, { chip: string; icon: string; glow: string }> = {
  indigo:  { chip: "bg-indigo-50",  icon: "text-indigo-600",  glow: "shadow-indigo-100" },
  violet:  { chip: "bg-violet-50",  icon: "text-violet-600",  glow: "shadow-violet-100" },
  emerald: { chip: "bg-emerald-50", icon: "text-emerald-600", glow: "shadow-emerald-100" },
  amber:   { chip: "bg-amber-50",   icon: "text-amber-600",   glow: "shadow-amber-100" },
  sky:     { chip: "bg-sky-50",     icon: "text-sky-600",     glow: "shadow-sky-100" },
  rose:    { chip: "bg-rose-50",    icon: "text-rose-600",    glow: "shadow-rose-100" },
  slate:   { chip: "bg-slate-100",  icon: "text-slate-600",   glow: "shadow-slate-100" },
};

interface StatCardProps {
  label:    string;
  value:    number;
  icon:     LucideIcon;
  accent?:  Accent;
  prefix?:  string;
  suffix?:  string;
  decimals?: number;
  hint?:    string;            // texto auxiliar bajo el valor
  trend?:   number;           // % de tendencia (positivo/negativo)
  href?:    string;
  index?:   number;           // para el stagger
  loading?: boolean;
}

export function StatCard({
  label, value, icon: Icon, accent = "indigo", prefix, suffix, decimals,
  hint, trend, href, index = 0, loading,
}: StatCardProps) {
  const a = ACCENTS[accent];

  const contenido = (
    <div
      className="animate-stagger-fade-up hover-lift bg-white rounded-2xl border border-slate-200 p-5 h-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${a.chip} rounded-xl flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${a.icon}`} />
        </div>
        {typeof trend === "number" && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
            trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-16 rounded-md skeleton mb-1" />
      ) : (
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
          <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
      )}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );

  if (href) {
    return <Link href={href} className="block group">{contenido}</Link>;
  }
  return contenido;
}
