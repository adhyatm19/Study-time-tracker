"use client";

import { BarChart3, CalendarDays, Flame, Timer } from "lucide-react";
import { useMemo } from "react";

import { Card } from "@/components/shared/card";
import {
  calculateBestStreak,
  calculateCurrentStreak,
  calculateRangeTotal,
  formatStudyDuration,
  toLocalDateKey
} from "@/lib/utils";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

function getElapsedDaysThisWeek() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function formatDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getBestDayThisMonth(sessions: StudySessionRow[]) {
  const monthStart = new Date();
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(1);

  const totals = new Map<string, number>();

  sessions.forEach((session) => {
    const startedAt = new Date(session.started_at);

    if (startedAt < monthStart) {
      return;
    }

    const key = toLocalDateKey(startedAt);
    totals.set(key, (totals.get(key) ?? 0) + session.duration_seconds);
  });

  return Array.from(totals.entries()).reduce<{ dateKey: string; seconds: number } | null>(
    (best, [dateKey, seconds]) => {
      if (!best || seconds > best.seconds) {
        return { dateKey, seconds };
      }

      return best;
    },
    null
  );
}

export function StatsCards({
  sessions,
  todayGoalSeconds
}: {
  sessions: StudySessionRow[];
  todayGoalSeconds?: number | null;
}) {
  const stats = useMemo(() => {
    const streak = calculateCurrentStreak(sessions);
    const bestStreak = calculateBestStreak(sessions);
    const todaySeconds = calculateRangeTotal(sessions, "today");
    const weekSeconds = calculateRangeTotal(sessions, "week");
    const monthSeconds = calculateRangeTotal(sessions, "month");
    const bestMonthDay = getBestDayThisMonth(sessions);
    const dailyGoalSeconds = todayGoalSeconds && todayGoalSeconds > 0 ? todayGoalSeconds : null;
    const goalProgress = dailyGoalSeconds
      ? Math.min(100, Math.round((todaySeconds / dailyGoalSeconds) * 100))
      : null;

    return [
      {
        icon: Timer,
        label: "Today",
        value: formatStudyDuration(todaySeconds),
        note:
          goalProgress !== null && dailyGoalSeconds
            ? `${goalProgress}% of ${formatStudyDuration(dailyGoalSeconds)} goal`
            : "Tracked today"
      },
      {
        icon: BarChart3,
        label: "This week",
        value: formatStudyDuration(weekSeconds),
        note:
          weekSeconds > 0
            ? `Avg/day: ${formatStudyDuration(Math.round(weekSeconds / getElapsedDaysThisWeek()))}`
            : "Since Monday"
      },
      {
        icon: CalendarDays,
        label: "This month",
        value: formatStudyDuration(monthSeconds),
        note: bestMonthDay
          ? `Best day: ${formatDayLabel(bestMonthDay.dateKey)}, ${formatStudyDuration(bestMonthDay.seconds)}`
          : "Current month"
      },
      {
        icon: Flame,
        label: "Current streak",
        value: `${streak} day${streak === 1 ? "" : "s"}`,
        note:
          bestStreak > 0
            ? `Best streak: ${bestStreak} day${bestStreak === 1 ? "" : "s"}`
            : "Consecutive study days"
      }
    ];
  }, [sessions, todayGoalSeconds]);

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
