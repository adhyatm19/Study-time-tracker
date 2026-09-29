"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({
  open,
  title,
  children,
  onClose,
  busy = false
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-border bg-card p-6 text-foreground shadow-lifted backdrop:bg-black/45"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        <Button
          variant="ghost"
          className="h-11 w-11 px-0"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
