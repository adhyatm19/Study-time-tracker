"use client";

import { useMemo } from "react";

import { StudyChart } from "@/components/dashboard/study-chart";
import { aggregateSessionsByDay, aggregateWeeklyAverage } from "@/lib/utils";
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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
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
