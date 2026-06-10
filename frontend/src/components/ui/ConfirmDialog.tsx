"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-slate-900/40 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-[90vw] max-w-sm z-50">
          <AlertDialog.Title className="text-base font-bold text-slate-900">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="text-sm text-slate-500 mt-2">
              {description}
            </AlertDialog.Description>
          )}
          <div className="flex gap-3 mt-6">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={loading}
                className="flex-1 flex items-center justify-center border border-slate-200 text-slate-700 font-semibold
                           rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50 text-white shadow-sm",
                variant === "danger"
                  ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
