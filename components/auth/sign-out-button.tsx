"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/shared/button";
import { LoadingSpinner } from "@/components/shared/loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SignOutButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function SignOutButton({ variant = "ghost", size = "sm", className }: SignOutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setIsSigningOut(false);
      return;
    }

    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  const isBusy = isSigningOut || isPending;

  return (
    <div>
      <Button variant={variant} size={size} className={className} onClick={handleSignOut} disabled={isBusy}>
        {isBusy ? <LoadingSpinner className="mr-2" /> : null}
        {isBusy ? "Signing out..." : "Log out"}
        {!isBusy ? <LogOut className="ml-2 h-4 w-4" aria-hidden="true" /> : null}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
