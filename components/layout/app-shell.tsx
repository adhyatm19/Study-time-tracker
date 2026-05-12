"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { BarChart3, LayoutDashboard, Settings, UsersRound } from "lucide-react";

import { UserMenu } from "@/components/auth/user-menu";
import { buttonStyles } from "@/components/shared/button";
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

  return (
    <div className="min-h-svh px-3 py-3 sm:px-5">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-background/75 shadow-lifted backdrop-blur-xl">
        <header className="border-b border-border/70 bg-card/80 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
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

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between xl:justify-end">
              <nav className="flex flex-wrap items-center gap-2 rounded-full bg-background/50 p-1 lg:justify-end">
                {NAV_ITEMS.map((item) => {
                  const Icon = navIcons[item.href];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:pl-3">
                <ThemeToggle />
                <UserMenu displayName={profile.display_name || "Study buddy"} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 sm:px-7">{children}</main>
      </div>
    </div>
  );
}
