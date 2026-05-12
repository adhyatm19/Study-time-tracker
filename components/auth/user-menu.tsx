"use client";

import { ChevronDown, Settings } from "lucide-react";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

export function UserMenu({
  displayName,
  groupCode,
  onNavigate
}: {
  displayName: string;
  groupCode?: string | null;
  onNavigate?: (href: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 text-sm font-medium transition hover:bg-muted/70",
          isOpen && "bg-muted text-accent"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-semibold text-accent">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate md:inline">{displayName}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", isOpen && "rotate-180")} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-2xl border border-border/70 bg-card p-2 shadow-lifted"
        >
          <div className="px-3 py-3">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {groupCode ? `Group ${groupCode}` : "No group code set"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onNavigate?.("/settings");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
            role="menuitem"
          >
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Settings
          </button>

          <div className="mt-2 border-t border-border/70 pt-2">
            <SignOutButton variant="ghost" size="sm" className="w-full justify-start rounded-xl px-3" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
