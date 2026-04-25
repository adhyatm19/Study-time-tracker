"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/button";
import { CardDescription } from "@/components/shared/card";
import { initialStopwatchState, STOPWATCH_STORAGE_KEY, type StopwatchTimerState, getElapsedSeconds } from "@/lib/timers";
import { saveStudySession } from "@/lib/study-sessions";
import { formatClock, formatDuration } from "@/lib/utils";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

interface StopwatchTimerProps {
  onSessionSaved: (session: StudySessionRow) => void;
  onStartGesture: () => void;
  onStudyStateChange: (isStudying: boolean) => void;
  onBusyStateChange: (isBusy: boolean) => void;
}

export function StopwatchTimer({
  onSessionSaved,
  onStartGesture,
  onStudyStateChange,
  onBusyStateChange
}: StopwatchTimerProps) {
  const [state, setState] = useState<StopwatchTimerState>(initialStopwatchState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const raw = window.localStorage.getItem(STOPWATCH_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StopwatchTimerState;
      setState(parsed);
    } catch {
      window.localStorage.removeItem(STOPWATCH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (state.status === "idle") {
      window.localStorage.removeItem(STOPWATCH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(state));
    }

    onStudyStateChange(state.status === "running");
    onBusyStateChange(state.status !== "idle");
  }, [isHydrated, onBusyStateChange, onStudyStateChange, state]);

  useEffect(() => {
    setNowMs(Date.now());

    if (state.status !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state.status]);

  const elapsedSeconds = useMemo(() => getElapsedSeconds(state, nowMs), [nowMs, state]);

  async function persistSession(snapshot: StopwatchTimerState, endedAt: string, durationSeconds: number) {
    setIsSaving(true);
    setFeedback(null);

    try {
      const session = await saveStudySession({
        started_at: snapshot.startedAt ?? endedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        mode: "stopwatch"
      });

      onSessionSaved(session);
      setState(initialStopwatchState);
      setFeedback(`Saved ${formatDuration(durationSeconds)} of focused study.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your study session.";
      setFeedback(message);
      setState(snapshot);
    } finally {
      setIsSaving(false);
    }
  }

  function handleStart() {
    onStartGesture();
    setFeedback(null);
    setNowMs(Date.now());
    setState({
      status: "running",
      startedAt: new Date().toISOString(),
      pausedAt: null,
      accumulatedPausedMs: 0
    });
  }

  function handlePause() {
    setFeedback(null);
    setState((current) => ({
      ...current,
      status: "paused",
      pausedAt: new Date().toISOString()
    }));
  }

  function handleResume() {
    onStartGesture();
    setFeedback(null);

    setState((current) => {
      if (!current.pausedAt) {
        return current;
      }

      return {
        ...current,
        status: "running",
        pausedAt: null,
        accumulatedPausedMs: current.accumulatedPausedMs + (Date.now() - new Date(current.pausedAt).getTime())
      };
    });
  }

  function handleDiscard() {
    const confirmed = window.confirm("Discard this stopwatch session without saving it?");

    if (!confirmed) {
      return;
    }

    setFeedback("Stopwatch session discarded.");
    setState(initialStopwatchState);
  }

  async function handleStop() {
    const endedAt = new Date();

    const snapshot: StopwatchTimerState =
      state.status === "running"
        ? {
            ...state,
            status: "paused",
            pausedAt: endedAt.toISOString()
          }
        : state;

    const durationSeconds = getElapsedSeconds(snapshot, endedAt.getTime());

    if (!durationSeconds) {
      setState(initialStopwatchState);
      return;
    }

    if (durationSeconds < 60) {
      const shouldSave = window.confirm(
        "This session is shorter than 60 seconds. Do you still want to save it?"
      );

      if (!shouldSave) {
        setState(initialStopwatchState);
        setFeedback("Short session discarded.");
        return;
      }
    }

    setState(snapshot);
    await persistSession(snapshot, endedAt.toISOString(), durationSeconds);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Stopwatch mode</p>
        <div className="mt-4 text-[clamp(3rem,8vw,5.5rem)] font-semibold tracking-[-0.04em]">{formatClock(elapsedSeconds)}</div>
        <CardDescription className="mt-3 max-w-lg">
          Real duration is calculated from timestamps, so the timer stays accurate even if the page refreshes.
        </CardDescription>
      </div>

      <div className="flex flex-wrap gap-3">
        {state.status === "idle" ? (
          <Button size="lg" onClick={handleStart}>
            Start
          </Button>
        ) : null}

        {state.status === "running" ? (
          <Button size="lg" variant="secondary" onClick={handlePause}>
            Pause
          </Button>
        ) : null}

        {state.status === "paused" ? (
          <Button size="lg" onClick={handleResume}>
            Resume
          </Button>
        ) : null}

        {state.status !== "idle" ? (
          <Button size="lg" variant="outline" onClick={() => void handleStop()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Stop & save"}
          </Button>
        ) : null}

        {state.status !== "idle" ? (
          <Button size="lg" variant="ghost" onClick={handleDiscard} disabled={isSaving}>
            Discard
          </Button>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/60 p-5 text-sm text-muted-foreground">
        <p>Sessions under 60 seconds ask for confirmation before they’re stored.</p>
        <p className="mt-2">Active stopwatch state is saved locally, so you can refresh and still resume or stop it.</p>
      </div>

      {feedback ? (
        <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">{feedback}</div>
      ) : null}
    </div>
  );
}
