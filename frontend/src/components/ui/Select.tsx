"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Nivel de indentación para opciones jerárquicas (categorías padre/hijo) */
  depth?: number;
}

interface SelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  name?: string;
}

export function Select({ value, onValueChange, options, placeholder = "Seleccionar…", icon: Icon, disabled, name }: SelectProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
      <RadixSelect.Trigger
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all",
          "data-[placeholder]:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
          <RadixSelect.Value placeholder={placeholder}>
            {selected?.label}
          </RadixSelect.Value>
        </span>
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform data-[state=open]:rotate-180" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="overflow-hidden bg-white rounded-xl shadow-lg border border-slate-200 z-50 w-[var(--radix-select-trigger-width)]"
        >
          <RadixSelect.Viewport className="p-1 max-h-72">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "relative flex items-center justify-between gap-2 rounded-lg text-sm px-3 py-2 cursor-pointer select-none outline-none",
                  "data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-700",
                  "data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700 data-[state=checked]:font-semibold"
                )}
                style={{ paddingLeft: `${0.75 + (opt.depth ?? 0) * 1}rem` }}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check className="h-4 w-4" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
