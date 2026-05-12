"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { BarChart3, LayoutDashboard, Menu, Settings, UsersRound, X } from "lucide-react";

import { UserMenu } from "@/components/auth/user-menu";
import { buttonStyles } from "@/components/shared/button";
import { PageLoader } from "@/components/shared/loading";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const navIcons = {
  "/dashboard": LayoutDashboard,
  "/analytics": BarChart3,
  "/leaderboard": UsersRound,
  "/settings": Settings
} as const;

export function AppShell({
  children,
  profile
}: {
  children: ReactNode;
  profile: ProfileRow;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  function navigateTo(href: string) {
    if (pathname === href) {
      setIsMenuOpen(false);
      return;
    }

    setIsMenuOpen(false);
    startNavigation(() => {
      router.push(href);
    });
  }

  return (
    <div className="min-h-svh px-3 py-3 sm:px-5">
      {isNavigating ? <PageLoader label="Opening page" /> : null}
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-background/75 shadow-lifted backdrop-blur-xl">
        <header className="border-b border-border/70 bg-card/85 px-4 py-4 sm:px-6">
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)]">
            <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-sm font-semibold text-accent shadow-sm">
                QL
              </div>
              <div>
                <p className="font-semibold">{APP_NAME}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.group_code ? `Group ${profile.group_code}` : "Set a group code in settings"}
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full bg-background/55 p-1 lg:flex">
              {NAV_ITEMS.map((item) => {
                const Icon = navIcons[item.href];

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigateTo(item.href)}
                    disabled={isNavigating}
                    className={cn(
                      buttonStyles({
                        variant: pathname === item.href ? "secondary" : "ghost",
                        size: "sm"
                      }),
                      "gap-2 px-4",
                      pathname === item.href && "bg-muted text-accent shadow-sm"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center justify-end gap-2">
              <div className="hidden items-center gap-2 lg:flex">
                <ThemeToggle />
                <UserMenu
                  displayName={profile.display_name || "Study buddy"}
                  groupCode={profile.group_code}
                  onNavigate={navigateTo}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                className="grid h-11 w-11 place-items-center rounded-full border border-border/70 bg-background/70 text-foreground transition hover:bg-muted lg:hidden"
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {isMenuOpen ? (
            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background/70 p-3 lg:hidden">
              <nav className="grid gap-2 sm:grid-cols-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = navIcons[item.href];

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigateTo(item.href)}
                      disabled={isNavigating}
                      className={cn(
                        buttonStyles({
                          variant: pathname === item.href ? "secondary" : "ghost",
                          size: "md"
                        }),
                        "justify-start gap-2 px-4",
                        pathname === item.href && "bg-muted text-accent shadow-sm"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                <ThemeToggle />
                <UserMenu
                  displayName={profile.display_name || "Study buddy"}
                  groupCode={profile.group_code}
                  onNavigate={navigateTo}
                />
              </div>
            </div>
          ) : null}
        </header>

        <main className="flex-1 px-5 py-8 sm:px-7">{children}</main>
      </div>
    </div>
  );
}
