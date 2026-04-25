"use client";

import { useEffect, useMemo, useState } from "react";

import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TimerCard } from "@/components/dashboard/timer-card";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { type LeaderboardEntry } from "@/lib/leaderboard";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

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

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime()
      ),
    [sessions]
  );

  function handleSessionSaved(session: StudySessionRow) {
    setSessions((current) => [session, ...current]);
  }

  function handleSessionDeleted(sessionId: string) {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Dashboard</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome back, {profile.display_name || "study buddy"}.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Keep the session timer nearby, glance at your rhythm, and compare progress with the people sharing your group code.
          </p>
        </div>

        <Card className="rounded-[1.75rem] p-5">
          <CardTitle>Group space</CardTitle>
          <CardDescription className="mt-2">
            {profile.group_code
              ? `You’re tracking with group ${profile.group_code}.`
              : "Set a group code in settings to unlock the shared leaderboard."}
          </CardDescription>
        </Card>
      </section>

      <StatsCards sessions={sortedSessions} />

      <TimerCard profile={profile} onSessionSaved={handleSessionSaved} />

      <RecentSessions sessions={sortedSessions} onSessionDeleted={handleSessionDeleted} />

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
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
