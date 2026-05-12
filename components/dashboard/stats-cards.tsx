"use client";

import { BarChart3, CalendarDays, Flame, Timer } from "lucide-react";
import { useMemo } from "react";

import { Card } from "@/components/shared/card";
import { calculateCurrentStreak, calculateRangeTotal, formatStudyDurationCompact } from "@/lib/utils";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

export function StatsCards({ sessions }: { sessions: StudySessionRow[] }) {
  const stats = useMemo(() => {
    const streak = calculateCurrentStreak(sessions);

    return [
      {
        icon: Timer,
        label: "Today",
        value: formatStudyDurationCompact(calculateRangeTotal(sessions, "today")),
        note: "Tracked today"
      },
      {
        icon: BarChart3,
        label: "This week",
        value: formatStudyDurationCompact(calculateRangeTotal(sessions, "week")),
        note: "Since Monday"
      },
      {
        icon: CalendarDays,
        label: "This month",
        value: formatStudyDurationCompact(calculateRangeTotal(sessions, "month")),
        note: "Current month"
      },
      {
        icon: Flame,
        label: "Current streak",
        value: `${streak} day${streak === 1 ? "" : "s"}`,
        note: "Consecutive study days"
      }
    ];
  }, [sessions]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.label} className="rounded-[1.35rem] p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              </div>
            </div>
          <p className="mt-2 text-sm text-muted-foreground">{stat.note}</p>
          </Card>
        );
      })}
    </div>
  );
}
