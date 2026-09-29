import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getProfileFallback } from "@/lib/profile";
import { getUserOrRedirect } from "@/lib/supabase/server";
export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await getUserOrRedirect();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <AppShell
      key={user.id}
      profile={profile ?? getProfileFallback(user)}
      profileError={
        error || !profile
          ? "Your profile could not be loaded. Timer recovery is available; reload to retry your saved preferences."
          : null
      }
    >
      {children}
    </AppShell>
  );
}
