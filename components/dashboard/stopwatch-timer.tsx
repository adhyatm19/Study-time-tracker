"use client";

import { Pause, Play, RotateCcw, Square, TimerIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/button";
import { initialStopwatchState, STOPWATCH_STORAGE_KEY, type StopwatchTimerState, getElapsedSeconds } from "@/lib/timers";
import { saveStudySession } from "@/lib/study-sessions";
import { formatClock, formatDuration } from "@/lib/utils";
import { type Database } from "@/types/database";
import { useFloatingTimer } from "@/components/dashboard/use-floating-timer";

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
  const { openFloatingTimer, floatingTimerMessage } = useFloatingTimer({
    mode: "stopwatch",
    status: state.status,
    seconds: elapsedSeconds,
    rounding: "floor"
  });

  async function persistSession(
    snapshot: StopwatchTimerState,
    endedAt: string,
    durationSeconds: number,
    note: string | null
  ) {
    setIsSaving(true);
    setFeedback(null);

    try {
      const session = await saveStudySession({
        started_at: snapshot.startedAt ?? endedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        mode: "stopwatch",
        note
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
    const note = window.prompt("What did you study?")?.trim() ?? "";
    await persistSession(snapshot, endedAt.toISOString(), durationSeconds, note || null);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="grid aspect-square w-full max-w-[25rem] place-items-center rounded-full p-2 shadow-inner"
        style={{
          background:
            "conic-gradient(hsl(var(--accent) / 0.38) 0deg 20deg, hsl(var(--muted)) 20deg 360deg)"
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-card/90 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Stopwatch</p>
            <div className="mt-4 font-mono text-5xl font-semibold leading-none sm:text-6xl">
              {formatClock(elapsedSeconds)}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {state.status === "running"
                ? "Studying now"
                : state.status === "paused"
                  ? "Paused"
                  : "Ready when you are"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {state.status === "idle" ? (
          <Button size="lg" className="min-w-32 gap-2" onClick={handleStart}>
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Start
          </Button>
        ) : null}

        {state.status === "running" ? (
          <Button size="lg" variant="secondary" className="min-w-32 gap-2" onClick={handlePause}>
            <Pause className="h-4 w-4" aria-hidden="true" />
            Pause
          </Button>
        ) : null}

        {state.status === "paused" ? (
          <Button size="lg" className="min-w-32 gap-2" onClick={handleResume}>
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Resume
          </Button>
        ) : null}

        <Button size="lg" variant="outline" className="gap-2" onClick={() => void openFloatingTimer()}>
          <TimerIcon className="h-4 w-4" aria-hidden="true" />
          Float
        </Button>

        {state.status !== "idle" ? (
          <Button size="lg" variant="outline" className="gap-2" onClick={() => void handleStop()} disabled={isSaving}>
            <Square className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Saving..." : "Stop & save"}
          </Button>
        ) : null}

        {state.status !== "idle" ? (
          <Button size="lg" variant="ghost" className="gap-2" onClick={handleDiscard} disabled={isSaving}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Discard
          </Button>
        ) : null}
      </div>

      {floatingTimerMessage ? (
        <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">
          {floatingTimerMessage}
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">{feedback}</div>
      ) : null}
    </div>
  );
}
