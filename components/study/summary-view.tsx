"use client";
import { useCallback, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseSummary, chartDays, weeklyChart } from "@/lib/summary";
import { useResource } from "./use-resource";
import { useStudy } from "./study-provider";
import { Card } from "@/components/shared/card";
import { LoadError } from "@/components/shared/feedback";
import { StudyChart } from "@/components/dashboard/study-chart";
import { formatDuration } from "@/lib/utils";
export function useSummary() {
  const load = useCallback(async () => {
    const { data, error } = await createSupabaseBrowserClient().rpc("get_study_summary");
    if (error) throw error;
    return parseSummary(data);
  }, []);
  const resource = useResource(load);
  const { now } = useStudy();
  const day = resource.data?.today;
  useEffect(() => {
    if (!resource.data) return;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: resource.data.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(now));
    const current = ["year", "month", "day"].map((t) => parts.find((p) => p.type === t)?.value).join("-");
    if (current !== day && !resource.loading && !resource.error) resource.refresh();
  }, [now, day, resource]);
  return resource;
}
export function SummaryView({ compact = false }: { compact?: boolean }) {
  const resource = useSummary();
  const summary = resource.data;
  if (resource.error) return <LoadError label="Study statistics" onRetry={resource.refresh} />;
  if (!summary)
    return (
      <p role="status" className="py-8 text-sm text-muted-foreground">
        Loading your study totals…
      </p>
    );
  const elapsedDays = ((new Date(`${summary.today}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  return (
    <section className="space-y-5" aria-label="Study statistics">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Today", formatDuration(summary.today_seconds), "Saved study time"],
          [
            "This week",
            formatDuration(summary.week_seconds),
            `${formatDuration(Math.round(summary.week_seconds / elapsedDays))} per day`
          ],
          ["This month", formatDuration(summary.month_seconds), "Since the first of the month"],
          [
            "Current streak",
            `${summary.current_streak} ${summary.current_streak === 1 ? "day" : "days"}`,
            `Best: ${summary.best_streak} ${summary.best_streak === 1 ? "day" : "days"}`
          ]
        ].map(([label, value, note]) => (
          <Card key={label} className="stat-card p-5">
            <p className="eyebrow">{label}</p>
            <p className="mt-4 text-2xl font-medium tracking-tight sm:text-3xl">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </Card>
        ))}
      </div>
      {!compact ? (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Lifetime study time</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.first_day ? `Since ${summary.first_day}` : "Your first session starts the story."}
              </p>
            </div>
            <p className="text-3xl font-semibold">{formatDuration(summary.total_seconds)}</p>
          </Card>
          <div className="grid gap-5 xl:grid-cols-2">
            <StudyChart
              title="Last 14 days"
              description="Daily saved study time."
              data={chartDays(summary.days, 14)}
              dataKey="hours"
            />
            <StudyChart
              title="Last 30 days"
              description="Your consistency over the past month."
              data={chartDays(summary.days, 30)}
              dataKey="hours"
            />
          </div>
          <StudyChart
            title="Weekly average"
            description="Average per calendar day. The current week includes elapsed days only."
            data={weeklyChart(summary)}
            dataKey="hours"
            kind="bar"
          />
        </>
      ) : null}
      <p className="text-xs leading-5 text-muted-foreground">
        Dates use {summary.timezone}. Sessions crossing midnight count toward the day they started. Today’s
        streak remains active if you studied yesterday.
      </p>
    </section>
  );
}
