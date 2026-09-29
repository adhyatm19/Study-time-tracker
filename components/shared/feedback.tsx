"use client";
import { Button } from "./button";
export function Feedback({ message, error = false }: { message: string | null; error?: boolean }) {
  return message ? (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-400/40 bg-red-500/5 text-red-700 dark:text-red-300" : "border-border bg-muted text-foreground"}`}
    >
      {message}
    </p>
  ) : null;
}
export function LoadError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border p-5" role="alert">
      <p className="mb-3 text-sm">{label} could not be loaded. Your existing data has not been changed.</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
