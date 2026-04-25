"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { UserMenu } from "@/components/auth/user-menu";
import { buttonStyles } from "@/components/shared/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function AppShell({
  children,
  profile
}: {
  children: ReactNode;
  profile: ProfileRow;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh px-4 py-4 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-7xl flex-col rounded-[2rem] border border-border/70 bg-background/65 shadow-lifted backdrop-blur-xl">
        <header className="border-b border-border/70 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border/70 bg-background/70 text-sm font-semibold">
                  QL
                </div>
                <div>
                  <p className="font-semibold">{APP_NAME}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.group_code ? `Group ${profile.group_code}` : "Set a group code in settings"}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <nav className="flex flex-wrap items-center gap-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      buttonStyles({
                        variant: pathname === item.href ? "primary" : "ghost",
                        size: "sm"
                      }),
                      pathname === item.href && "shadow-none dark:bg-accent dark:text-accent-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <ThemeToggle />
                <UserMenu displayName={profile.display_name || "Study buddy"} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
