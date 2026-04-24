import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { SiteHeader } from "@/components/layout/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SignUpPage() {
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
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Sign up</p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Start a quiet accountability loop with your study group.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Create your account, set a shared group code, and begin tracking focused sessions with a clean,
              distraction-light dashboard.
            </p>
          </div>
          <AuthForm mode="sign-up" />
        </div>
      </main>
    </div>
  );
}
