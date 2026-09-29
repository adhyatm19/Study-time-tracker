import Link from "next/link";

import { AuthButton } from "@/components/auth/auth-button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME } from "@/lib/constants";

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <div className="brand-mark shrink-0">ql.</div>
        <div className="hidden sm:block">
          <p className="font-semibold">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">Your focus studio.</p>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <AuthButton isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
