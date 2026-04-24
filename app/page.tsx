import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { buttonStyles } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="grid-overlay absolute inset-0 opacity-40" />
      <SiteHeader isAuthenticated={Boolean(user)} />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 pb-16 pt-8">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-soft">
              Private study tracking for close-knit friend groups
            </p>
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              {APP_NAME} keeps your focus visible without turning it into a game.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Track real study sessions, settle into a calm timer, and compare progress with your group through a
              shared leaderboard and simple analytics.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={user ? "/dashboard" : "/auth/sign-up"} className={buttonStyles({ size: "lg" })}>
                {user ? "Go to dashboard" : "Start tracking"}
              </Link>
              <Link href={user ? "/leaderboard" : "/auth/login"} className={buttonStyles({ variant: "outline", size: "lg" })}>
                {user ? "View leaderboard" : "Sign in"}
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                ["Two timer modes", "Stopwatch and Pomodoro, both persisted across refreshes."],
                ["Shared leaderboard", "Only friends with the same group code appear together."],
                ["Soft analytics", "14-day, 30-day, and weekly average charts without clutter."]
              ].map(([title, description]) => (
                <Card key={title} className="rounded-[1.75rem] p-5">
                  <p className="font-medium">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border/70 px-6 py-5">
                <p className="text-sm font-medium text-muted-foreground">Timer preview</p>
              </div>
              <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Free stopwatch</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight">02:14:27</p>
                  </div>
                  <div className="rounded-full border border-border/70 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                    Rain ambience
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl bg-muted px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today</p>
                    <p className="mt-2 text-2xl font-semibold">4.5h</p>
                  </div>
                  <div className="rounded-3xl bg-muted px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Streak</p>
                    <p className="mt-2 text-2xl font-semibold">6 days</p>
                  </div>
                  <div className="rounded-3xl bg-muted px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</p>
                    <p className="mt-2 text-2xl font-semibold">22.8h</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-0">
              <div className="border-b border-border/70 px-6 py-5">
                <p className="text-sm font-medium text-muted-foreground">Leaderboard preview</p>
              </div>
              <div className="space-y-4 p-6">
                {[
                  ["1", "Aadhya", "38.4h"],
                  ["2", "Mira", "35.9h"],
                  ["3", "Rehan", "33.1h"]
                ].map(([rank, name, total]) => (
                  <div key={name} className="flex items-center justify-between rounded-3xl bg-muted/80 px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border/70 bg-background/80 text-sm font-semibold">
                        {rank}
                      </div>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">Quiet study circle</p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold">{total}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">What’s included</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                "Supabase email/password auth",
                "Private group leaderboard via shared group code",
                "Ambient BGM from local audio files",
                "Mobile-friendly dashboard layout",
                "Daily and weekly analytics with Recharts",
                "Profile settings for defaults and preferences"
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-border/70 bg-background/70 px-4 py-4 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Built for a polished MVP</p>
              <p className="mt-4 text-lg leading-8">
                Clean cards, soft spacing, dark mode, and deploy-ready structure for Vercel and Supabase.
              </p>
            </div>
            <Link
              href={user ? "/dashboard" : "/auth/sign-up"}
              className={cn(buttonStyles({ variant: "outline" }), "mt-8 justify-center")}
            >
              {user ? "Continue to app" : "Create your group space"}
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}
