"use client";

import { CalendarClock, Clock3 } from "lucide-react";
import { useMemo } from "react";

import { StudyChart } from "@/components/dashboard/study-chart";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import {
  aggregateSessionsByDay,
  aggregateWeeklyAverage,
  calculateRangeTotal,
  formatStudyDuration
} from "@/lib/utils";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

export function AnalyticsSection({
  sessions,
  showThirtyDay = true
}: {
  sessions: StudySessionRow[];
  showThirtyDay?: boolean;
}) {
  const fourteenDay = useMemo(() => aggregateSessionsByDay(sessions, 14), [sessions]);
  const thirtyDay = useMemo(() => aggregateSessionsByDay(sessions, 30), [sessions]);
  const weeklyAverage = useMemo(() => aggregateWeeklyAverage(sessions), [sessions]);
  const totalStudied = useMemo(() => calculateRangeTotal(sessions, "all"), [sessions]);
  const firstSessionDate = useMemo(() => {
    const firstSession = [...sessions].sort(
      (left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime()
    )[0];

    if (!firstSession) {
      return "Start logging sessions to begin the lifetime total.";
    }

    return `Since ${new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date(firstSession.started_at))}`;
  }, [sessions]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-[1.35rem] p-6 xl:col-span-2">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-accent">
              <Clock3 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Total time studied</CardTitle>
              <CardDescription className="mt-1">{firstSessionDate}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/70 px-5 py-3">
            <CalendarClock className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="text-2xl font-semibold sm:text-3xl">{formatStudyDuration(totalStudied)}</p>
          </div>
        </div>
      </Card>

      <StudyChart
        title="Last 14 days"
        description="Daily study hours over the last two weeks."
        data={fourteenDay}
        dataKey="hours"
      />
      {showThirtyDay ? (
        <StudyChart
          title="Last 30 days"
          description="A wider view of your month-to-month consistency."
          data={thirtyDay}
          dataKey="hours"
        />
      ) : (
        <StudyChart
          title="Weekly average"
          description="Average study hours per day for each week."
          data={weeklyAverage}
          dataKey="hours"
          kind="bar"
          emptyDescription="Track a few sessions and your weekly rhythm will start to appear here."
        />
      )}
      {showThirtyDay ? (
        <div className="xl:col-span-2">
          <StudyChart
            title="Weekly average"
            description="Average study hours per day for each week."
            data={weeklyAverage}
            dataKey="hours"
            kind="bar"
            emptyDescription="Track a few sessions and your weekly rhythm will start to appear here."
          />
        </div>
      ) : null}
    </div>
  );
}
