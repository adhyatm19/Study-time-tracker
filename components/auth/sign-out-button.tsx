"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/shared/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SignOutButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function SignOutButton({ variant = "ghost", size = "sm", className }: SignOutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div>
      <Button variant={variant} size={size} className={className} onClick={handleSignOut} disabled={isPending}>
        {isPending ? "Signing out..." : "Log out"}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
