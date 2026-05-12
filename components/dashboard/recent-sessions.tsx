"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { deleteStudySession } from "@/lib/study-sessions";
import { formatDuration } from "@/lib/utils";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

interface RecentSessionsProps {
  sessions: StudySessionRow[];
  onSessionDeleted: (sessionId: string) => void;
  compact?: boolean;
}

function formatSessionDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function RecentSessions({ sessions, onSessionDeleted, compact = false }: RecentSessionsProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleDelete(session: StudySessionRow) {
    const confirmed = window.confirm(
      `Delete this ${session.mode} session from ${formatSessionDate(session.started_at)}?`
    );

    if (!confirmed) {
      return;
    }

    setPendingId(session.id);
    setFeedback(null);

    try {
      await deleteStudySession(session.id);
      onSessionDeleted(session.id);
      setFeedback("Session deleted.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete that session.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="p-0">
      <div className="border-b border-border/70 px-5 py-4 sm:px-6 sm:py-5">
        <CardTitle>Recent sessions</CardTitle>
        {!compact ? (
          <CardDescription className="mt-2">
            Delete mistaken saves here. If a timer is still running, use its discard action instead of saving it.
          </CardDescription>
        ) : null}
      </div>

      {feedback ? <div className="border-b border-border/70 bg-muted px-6 py-3 text-sm text-foreground">{feedback}</div> : null}

      {sessions.length ? (
        <div className="divide-y divide-border/70">
          {sessions.slice(0, compact ? 4 : 8).map((session) => (
            <div key={session.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="font-medium capitalize">{session.mode} session</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSessionDate(session.started_at)} · {formatDuration(session.duration_seconds)}
                </p>
                {session.note ? (
                  <p className="mt-2 max-w-2xl text-sm text-foreground/80">{session.note}</p>
                ) : null}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDelete(session)}
                disabled={pendingId === session.id}
                className={compact ? "w-fit" : undefined}
              >
                {pendingId === session.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-10 text-sm text-muted-foreground">No saved sessions yet.</div>
      )}
    </Card>
  );
}
