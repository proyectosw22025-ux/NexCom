"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  max?: number;
  disabled?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function QuantityStepper({ value, max, disabled, onDecrement, onIncrement }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center
                   hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="h-3 w-3 text-slate-600" />
      </button>
      <span className="w-7 text-center text-sm font-medium text-slate-900">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center
                   hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="h-3 w-3 text-slate-600" />
      </button>
    </div>
  );
}
