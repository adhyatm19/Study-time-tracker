import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function buttonStyles({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55",
    variant === "primary" &&
      "bg-foreground text-background shadow-soft hover:-translate-y-0.5 hover:opacity-95 dark:bg-accent dark:text-accent-foreground",
    variant === "secondary" && "bg-muted text-foreground hover:bg-muted/80",
    variant === "ghost" && "bg-transparent text-foreground hover:bg-muted/70",
    variant === "outline" && "border border-border bg-background/70 text-foreground hover:bg-muted/50",
    size === "sm" && "h-10 px-4 text-sm",
    size === "md" && "h-11 px-5 text-sm",
    size === "lg" && "h-12 px-6 text-sm",
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref
) {
  return <button ref={ref} type={type} className={buttonStyles({ variant, size, className })} {...props} />;
});
