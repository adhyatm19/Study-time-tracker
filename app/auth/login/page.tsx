import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { SiteHeader } from "@/components/layout/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-svh">
      <SiteHeader isAuthenticated={false} />
      <main className="mx-auto flex w-full max-w-7xl items-center px-6 pb-16 pt-8">
        <div className="grid w-full gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-xl self-center">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Sign in</p>
            <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">Pick up your timer where you left it.</h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Your sessions, personal charts, and group leaderboard stay in one calm workspace across desktop
              and mobile.
            </p>
          </div>
          <div>
            {params.error ? (
              <p role="alert" className="mb-4 rounded-xl border border-border p-4 text-sm">
                This link could not be verified. Request a new reset or verification email.
              </p>
            ) : null}
            <AuthForm mode="login" />
          </div>
        </div>
      </main>
    </div>
  );
}
