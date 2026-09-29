import Link from "next/link";
import { ArrowUpRight, AudioLines, ChartNoAxesCombined, Timer, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonStyles } from "@/components/shared/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const destination = user ? "/dashboard" : "/auth/sign-up";
  return (
    <div className="overflow-hidden">
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <section className="grid items-center gap-16 py-14 lg:min-h-[650px] lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-20">
          <div>
            <p className="eyebrow flex items-center gap-3 !text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Introducing your personal focus space
            </p>
            <h1 className="mt-7 text-[clamp(3.4rem,7.3vw,6.6rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
              A little focus.
              <br />
              A lot of
              <br />
              <span className="text-accent">possibility.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
              A beautiful space to do your best work. Find your flow, build a study habit, and make every
              session count.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={destination} className={buttonStyles({ size: "lg", className: "gap-5" })}>
                {user ? "Back to your workspace" : "Find your focus"}
                <ArrowUpRight size={18} />
              </Link>
              <Link href="#details" className={buttonStyles({ variant: "ghost", size: "lg" })}>
                Take a closer look
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Beautifully simple. Quietly powerful.</p>
          </div>
          <div className="landing-clock relative">
            <div aria-hidden="true" className="absolute -inset-10 -z-10 rounded-full bg-accent/5 blur-3xl" />
            <div className="focus-panel rounded-[2rem] border border-border p-6 shadow-lifted sm:p-8">
              <div className="flex items-center justify-between">
                <span className="eyebrow">The focus studio</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Preview</span>
              </div>
              <div className="my-10">
                <div className="timer-orbit">
                  <p className="eyebrow !text-accent">Time to go deeper</p>
                  <p className="timer-digits my-3">25:00</p>
                  <p className="text-xs text-muted-foreground">One thing at a time.</p>
                </div>
              </div>
              <Link href={destination} className={buttonStyles({ size: "lg", className: "w-full gap-3" })}>
                Start your first session
                <ArrowUpRight size={17} />
              </Link>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <AudioLines size={16} />
                  Set the atmosphere
                </span>
                <span>Rain · Fireplace · White noise</span>
              </div>
            </div>
          </div>
        </section>
        <section id="details" className="border-t border-border py-12">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl font-medium tracking-tight">Built for the way you work.</h2>
            <p className="text-sm text-muted-foreground">Everything you need to keep showing up.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Timer,
                number: "01",
                title: "Get into the zone",
                text: "Set a Pomodoro or follow your own pace. Keep your timer close with focus mode and ambient sound."
              },
              {
                icon: ChartNoAxesCombined,
                number: "02",
                title: "See your momentum",
                text: "Turn your sessions into a clearer picture. Daily goals, study history, and insights that make progress visible."
              },
              {
                icon: UsersRound,
                number: "03",
                title: "Grow together",
                text: "A little accountability goes a long way. Invite your people to a private study circle and build a rhythm together."
              }
            ].map(({ icon: Icon, number, title, text }) => (
              <div key={number} className="card-surface rounded-3xl border border-border/30 p-8">
                <div className="flex items-center justify-between">
                  <Icon size={23} strokeWidth={1.5} className="text-accent" />
                  <span className="eyebrow">{number}</span>
                </div>
                <h3 className="mb-3 mt-8 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-7 text-xs text-muted-foreground">
          <p>Quiet Ledger</p>
          <p>Make space for what matters.</p>
        </footer>
      </main>
    </div>
  );
}
