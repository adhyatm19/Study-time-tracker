import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-4 w-4 animate-spin", className)} aria-hidden="true" />;
}

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="h-1 w-full overflow-hidden bg-accent/10">
        <div className="h-full w-1/3 animate-[page-loader_1.15s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
