"use client";

import { ChevronDown } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";

export function UserMenu({
  displayName
}: {
  displayName: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full px-4 py-2 text-right md:flex">
        <p className="text-sm font-medium">{displayName}</p>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <SignOutButton />
    </div>
  );
}
