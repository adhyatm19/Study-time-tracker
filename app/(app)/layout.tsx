import { type ReactNode } from "react";

import { type Database } from "@/types/database";
import { AppShell } from "@/components/layout/app-shell";
import { getProfileFallback } from "@/lib/profile";
import { getUserOrRedirect } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export default async function AuthenticatedLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { supabase, user } = await getUserOrRedirect();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  return <AppShell email={user.email ?? ""} profile={(profile ?? getProfileFallback(user)) as ProfileRow}>{children}</AppShell>;
}
