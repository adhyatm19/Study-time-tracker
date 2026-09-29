"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import { Button } from "@/components/shared/button";
export function UserMenu({
  displayName,
  onNavigate
}: {
  displayName: string;
  groupCode?: string | null;
  onNavigate?: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        ref={trigger}
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="account-options"
        aria-label={`Account for ${displayName}`}
        onClick={() => setOpen(!open)}
        className="gap-2"
      >
        <span className="max-w-20 truncate sm:max-w-32">{displayName}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </Button>
      {open ? (
        <div
          id="account-options"
          className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-card p-3 shadow-lifted"
        >
          <p className="mb-2 truncate px-2 text-sm font-semibold">{displayName}</p>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setOpen(false);
              onNavigate?.("/settings");
            }}
          >
            Settings
          </Button>
          <SignOutButton className="w-full justify-start" />
        </div>
      ) : null}
    </div>
  );
}
