"use client";

import { Check } from "lucide-react";

export type CheckoutStep = "carrito" | "pago" | "confirmacion";

interface StepDef {
  key:   CheckoutStep;
  label: string;
}

const STEPS: StepDef[] = [
  { key: "carrito",      label: "Carrito" },
  { key: "pago",         label: "Pago" },
  { key: "confirmacion", label: "Confirmación" },
];

interface CheckoutStepperProps {
  current: CheckoutStep;
  /** En la pantalla de confirmación, indica si el pago fue exitoso (los 3 pasos en verde) */
  success?: boolean;
}

/**
 * Barra de progreso de 3 pasos para el flujo de checkout
 * (patrón Amazon/Shopify/MercadoLibre). Visibilidad del estado del sistema:
 * el usuario siempre sabe en qué paso está y cuántos faltan.
 */
export function CheckoutStepper({ current, success = true }: CheckoutStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Progreso de compra" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const isCompleted =
            index < currentIndex ||
            (current === "confirmacion" && index <= currentIndex && success);
          const isCurrent = index === currentIndex && !isCompleted;
          const isLast    = index === STEPS.length - 1;

          return (
            <li
              key={step.key}
              className="flex items-center"
              style={{ flex: isLast ? "0 0 auto" : "1 1 0%" }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span
                  className={[
                    "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold",
                    "transition-colors duration-300",
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                      : isCurrent
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={[
                    "text-xs font-semibold transition-colors duration-300 whitespace-nowrap",
                    isCompleted ? "text-emerald-600" : isCurrent ? "text-indigo-700" : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 sm:mx-3 -mt-5 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-500",
                      index < currentIndex ? "w-full bg-emerald-500" : "w-0 bg-indigo-600",
                    ].join(" ")}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
