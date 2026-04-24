import Link from "next/link";

import { AuthButton } from "@/components/auth/auth-button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME } from "@/lib/constants";

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border/70 bg-background/80 text-sm font-semibold shadow-soft">
          QL
        </div>
        <div>
          <p className="font-semibold">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">Study time, shared gently.</p>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <AuthButton isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
