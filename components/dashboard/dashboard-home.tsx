"use client";

import { Leaf, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TimerCard } from "@/components/dashboard/timer-card";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { type LeaderboardEntry } from "@/lib/leaderboard";
import { calculateRangeTotal, toLocalDateKey } from "@/lib/utils";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
const TODAY_GOAL_STORAGE_KEY = "quiet-ledger:today-goal:v1";

interface DashboardHomeProps {
  currentUserId: string;
  profile: ProfileRow;
  initialSessions: StudySessionRow[];
  leaderboardEntries: LeaderboardEntry[];
}

export function DashboardHome({
  currentUserId,
  profile,
  initialSessions,
  leaderboardEntries
}: DashboardHomeProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showFocusTip, setShowFocusTip] = useState(true);
  const [todayGoalSeconds, setTodayGoalSeconds] = useState<number | null>(null);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    const todayKey = toLocalDateKey(new Date());
    const raw = window.localStorage.getItem(TODAY_GOAL_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { date?: string; seconds?: number };

      if (parsed.date === todayKey && typeof parsed.seconds === "number" && parsed.seconds > 0) {
        setTodayGoalSeconds(parsed.seconds);
        return;
      }

      window.localStorage.removeItem(TODAY_GOAL_STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(TODAY_GOAL_STORAGE_KEY);
    }
  }, []);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime()
      ),
    [sessions]
  );
  const todayStudySeconds = useMemo(() => calculateRangeTotal(sortedSessions, "today"), [sortedSessions]);

  function handleSessionSaved(session: StudySessionRow) {
    setSessions((current) => [session, ...current]);
  }

  function handleSessionDeleted(sessionId: string) {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
  }

  function handleTodayGoalChange(goalSeconds: number | null) {
    setTodayGoalSeconds(goalSeconds);

    if (goalSeconds && goalSeconds > 0) {
      window.localStorage.setItem(
        TODAY_GOAL_STORAGE_KEY,
        JSON.stringify({ date: toLocalDateKey(new Date()), seconds: goalSeconds })
      );
      return;
    }

    window.localStorage.removeItem(TODAY_GOAL_STORAGE_KEY);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.65fr] xl:items-end">
        <div>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Welcome back, {profile.display_name || "study buddy"}.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Stay focused, track your progress, and achieve your goals with your group.
          </p>
        </div>

        <Card className="rounded-[1.35rem] p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-accent">
              <UsersRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Group space</CardTitle>
              <CardDescription className="mt-1">
                {profile.group_code
                  ? `You’re tracking with group ${profile.group_code}.`
                  : "Set a group code in settings to unlock the shared leaderboard."}
              </CardDescription>
            </div>
          </div>
        </Card>
      </section>

      <StatsCards sessions={sortedSessions} todayGoalSeconds={todayGoalSeconds} />

      <TimerCard
        profile={profile}
        onSessionSaved={handleSessionSaved}
        todayGoalSeconds={todayGoalSeconds}
        todayStudySeconds={todayStudySeconds}
        onTodayGoalChange={handleTodayGoalChange}
      />

      {showFocusTip ? (
        <Card className="flex items-center gap-4 rounded-[1.1rem] bg-muted/70 p-4">
          <Leaf className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Focus Tip</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Take breaks, stay hydrated, and trust the process. Small steps every day lead to big results.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFocusTip(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-background/70 text-muted-foreground"
            aria-label="Dismiss focus tip"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </Card>
      ) : null}

      <RecentSessions sessions={sortedSessions} onSessionDeleted={handleSessionDeleted} />

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A quick picture of your recent study patterns, with a fuller analytics page for deeper review.
          </p>
        </div>
        <AnalyticsSection sessions={sortedSessions} showThirtyDay={false} />
      </section>

      <Leaderboard
        entries={leaderboardEntries}
        activeFilter="all"
        currentUserId={currentUserId}
        groupCode={profile.group_code}
        compact
        showFilters={false}
      />
    </div>
  );
}
