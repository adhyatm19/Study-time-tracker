"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { BarChart3, Timer, History, UsersRound, Settings } from "lucide-react";
import { StudyProvider, useStudy } from "@/components/study/study-provider";
import { PersistentTimer } from "@/components/study/persistent-timer";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/shared/button";
import type { Profile } from "@/types/database";
const nav = [
  { href: "/dashboard", label: "Timer", icon: Timer },
  { href: "/history", label: "History", icon: History },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/leaderboard", label: "Circle", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings }
];
function Shell({ children, profileError }: { children: ReactNode; profileError: string | null }) {
  const s = useStudy();
  const path = usePathname();
  const router = useRouter();
  const focused = s.focused && path === "/dashboard";
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-28 sm:px-7 lg:pb-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:p-3">
        Skip to main content
      </a>
      <aside
        hidden={focused}
        className="glass-sidebar fixed inset-y-0 left-0 z-30 hidden w-56 flex-col overflow-y-auto border-r border-border/40 px-4 py-6 lg:flex"
      >
        <Link href="/dashboard" className="flex items-center gap-3 text-[14px] font-semibold tracking-tight">
          <span className="brand-mark shrink-0">ql.</span>
          <span>
            Quiet Ledger
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              A space for your day
            </span>
          </span>
        </Link>
        <p className="eyebrow mb-3 mt-10 px-3">Your workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={path === item.href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13px] transition-colors ${path === item.href ? "bg-card font-semibold text-accent shadow-sm ring-1 ring-border/40" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <span className="section-icon !h-7 !w-7 !rounded-lg">
                <item.icon size={16} strokeWidth={1.8} aria-hidden="true" />
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3 pt-10 text-muted-foreground">
          <p className="text-sm font-medium">
            Small sessions.
            <br />
            Lasting progress.
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            A little more focused,
            <br />
            every day.
          </p>
        </div>
      </aside>
      <div className={focused ? "mx-auto max-w-6xl" : "lg:ml-56 lg:pl-5"}>
        <header
          hidden={focused}
          className="flex items-center justify-between gap-3 border-b border-border/40 py-4"
        >
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold lg:hidden">
            <span className="brand-mark">ql.</span>
            <span className="hidden sm:inline">Quiet Ledger</span>
          </Link>
          <div className="hidden lg:block">
            <p className="eyebrow">
              Quiet Ledger / {nav.find((item) => item.href === path)?.label ?? "Study"}
            </p>
            <p className="mt-1 text-[13px] font-medium">
              Welcome back, {s.profile.display_name || "study buddy"}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              displayName={s.profile.display_name || "Study buddy"}
              onNavigate={(href) => router.push(href)}
            />
          </div>
        </header>
        <main id="main-content" className={focused ? "py-6" : "py-6"}>
          {profileError ? (
            <div role="alert" className="mb-4 rounded-xl border border-border p-4 text-sm">
              {profileError}
              <Button variant="ghost" onClick={() => router.refresh()}>
                Retry profile
              </Button>
            </div>
          ) : null}
          <PersistentTimer />
          <div hidden={focused}>{children}</div>
        </main>
      </div>
      <nav
        hidden={focused}
        aria-label="Mobile navigation"
        className="glass-dock fixed inset-x-3 mx-auto max-w-lg bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[22px] border border-border/40 p-2 lg:hidden"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={path === item.href ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] ${path === item.href ? "bg-muted font-semibold text-accent" : "text-muted-foreground"}`}
          >
            <item.icon size={19} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function AppShell({
  children,
  profile,
  profileError = null
}: {
  children: ReactNode;
  profile: Profile;
  profileError?: string | null;
}) {
  return (
    <StudyProvider profile={profile}>
      <Shell profileError={profileError}>{children}</Shell>
    </StudyProvider>
  );
}
