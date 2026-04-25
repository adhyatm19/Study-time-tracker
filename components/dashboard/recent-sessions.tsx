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
}

function formatSessionDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function RecentSessions({ sessions, onSessionDeleted }: RecentSessionsProps) {
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
      <div className="border-b border-border/70 px-6 py-5">
        <CardTitle>Recent sessions</CardTitle>
        <CardDescription className="mt-2">
          Delete mistaken saves here. If a timer is still running, use its discard action instead of saving it.
        </CardDescription>
      </div>

      {feedback ? <div className="border-b border-border/70 bg-muted px-6 py-3 text-sm text-foreground">{feedback}</div> : null}

      {sessions.length ? (
        <div className="divide-y divide-border/70">
          {sessions.slice(0, 8).map((session) => (
            <div key={session.id} className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium capitalize">{session.mode} session</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSessionDate(session.started_at)} · {formatDuration(session.duration_seconds)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDelete(session)}
                disabled={pendingId === session.id}
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
