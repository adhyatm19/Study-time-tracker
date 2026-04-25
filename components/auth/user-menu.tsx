"use client";

import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/shared/button";

export function UserMenu({
  displayName
}: {
  displayName: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden rounded-full border border-border/70 bg-background/70 px-4 py-2 text-right md:block">
        <p className="text-sm font-medium">{displayName}</p>
      </div>
      <Link href="/settings">
        <Button variant="outline" size="sm">
          Settings
        </Button>
      </Link>
      <SignOutButton />
    </div>
  );
}
