"use client";

import { useMemo } from "react";

import { Card } from "@/components/shared/card";
import { calculateCurrentStreak, calculateRangeTotal, formatStudyDuration } from "@/lib/utils";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

export function StatsCards({ sessions }: { sessions: StudySessionRow[] }) {
  const stats = useMemo(
    () => [
      {
        label: "Today",
        value: formatStudyDuration(calculateRangeTotal(sessions, "today")),
        note: "Tracked today"
      },
      {
        label: "This week",
        value: formatStudyDuration(calculateRangeTotal(sessions, "week")),
        note: "Since Monday"
      },
      {
        label: "This month",
        value: formatStudyDuration(calculateRangeTotal(sessions, "month")),
        note: "Current month"
      },
      {
        label: "Current streak",
        value: `${calculateCurrentStreak(sessions)} day${calculateCurrentStreak(sessions) === 1 ? "" : "s"}`,
        note: "Consecutive study days"
      }
    ],
    [sessions]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{stat.value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{stat.note}</p>
        </Card>
      ))}
    </div>
  );
}
