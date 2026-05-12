import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { getUserOrRedirect } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const { supabase } = await getUserOrRedirect();

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("*")
    .order("started_at", { ascending: false });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Analytics</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">A calmer look at your consistency.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Review the last 14 days, last 30 days, and your weekly averages without losing the clean dashboard feel.
        </p>
      </section>

      <Card className="p-6">
        <CardTitle>How to read this</CardTitle>
        <CardDescription className="mt-2">
          Charts are shown in hours with one decimal place, making it easy to compare short bursts and long study blocks on the same scale.
        </CardDescription>
      </Card>

      <AnalyticsSection sessions={sessions ?? []} showThirtyDay />
    </div>
  );
}
