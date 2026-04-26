"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/shared/button";
import { CardDescription } from "@/components/shared/card";
import { Input, Label } from "@/components/shared/input";
import {
  createInitialPomodoroState,
  getPomodoroElapsedSeconds,
  getPomodoroRemainingSeconds,
  POMODORO_STORAGE_KEY,
  type PomodoroTimerState
} from "@/lib/timers";
import { saveStudySession } from "@/lib/study-sessions";
import { formatClock, formatDuration } from "@/lib/utils";
import { type Database } from "@/types/database";
import { useFloatingTimer } from "@/components/dashboard/use-floating-timer";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
const POMODORO_NOTIFICATIONS_STORAGE_KEY = "quiet-ledger:pomodoro-notifications";

interface PomodoroTimerProps {
  defaultFocusMinutes: number;
  defaultBreakMinutes: number;
  onSessionSaved: (session: StudySessionRow) => void;
  onStartGesture: () => void;
  onStudyStateChange: (isStudying: boolean) => void;
  onBusyStateChange: (isBusy: boolean) => void;
}

export function PomodoroTimer({
  defaultFocusMinutes,
  defaultBreakMinutes,
  onSessionSaved,
  onStartGesture,
  onStudyStateChange,
  onBusyStateChange
}: PomodoroTimerProps) {
  const [state, setState] = useState<PomodoroTimerState>(() =>
    createInitialPomodoroState(defaultFocusMinutes, defaultBreakMinutes)
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const transitionRef = useRef(false);
  const phaseEndNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEY);
    const supportsNotifications = "Notification" in window;
    setNotificationsSupported(supportsNotifications);

    if (supportsNotifications) {
      const storedNotifications = window.localStorage.getItem(POMODORO_NOTIFICATIONS_STORAGE_KEY) === "true";
      const canNotify = Notification.permission === "granted";
      setNotificationsEnabled(storedNotifications && canNotify);

      if (storedNotifications && Notification.permission === "denied") {
        window.localStorage.removeItem(POMODORO_NOTIFICATIONS_STORAGE_KEY);
        setNotificationMessage("Notifications were blocked.");
      }
    }

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PomodoroTimerState;
      setState(parsed);
    } catch {
      window.localStorage.removeItem(POMODORO_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (state.status === "idle" && !state.phaseStartedAt) {
      window.localStorage.removeItem(POMODORO_STORAGE_KEY);
    } else {
      window.localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
    }

    onStudyStateChange(state.status === "running" && state.phase === "focus");
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

  const remainingSeconds = useMemo(() => getPomodoroRemainingSeconds(state, nowMs), [nowMs, state]);
  const { openFloatingTimer, floatingTimerMessage } = useFloatingTimer({
    mode: "pomodoro",
    phase: state.phase,
    status: state.status,
    seconds: remainingSeconds,
    rounding: "ceil"
  });

  useEffect(() => {
    phaseEndNotificationRef.current = null;
  }, [state.phase, state.phaseStartedAt]);

  function notifyPhaseComplete(completedPhase: PomodoroTimerState["phase"], phaseStartedAt: string | null) {
    if (!notificationsEnabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const notificationKey = `${completedPhase}:${phaseStartedAt ?? "not-started"}`;

    if (phaseEndNotificationRef.current === notificationKey) {
      return;
    }

    phaseEndNotificationRef.current = notificationKey;

    try {
      if (completedPhase === "focus") {
        new Notification("Focus session complete", { body: "Time for a break." });
      } else {
        new Notification("Break complete", { body: "Time to start studying again." });
      }
    } catch {
      setNotificationMessage("Notifications could not be shown.");
    }
  }

  async function handleNotificationsClick() {
    setNotificationMessage(null);

    if (!("Notification" in window)) {
      setNotificationsEnabled(false);
      setNotificationMessage("Notifications are not supported in this browser.");
      return;
    }

    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      window.localStorage.removeItem(POMODORO_NOTIFICATIONS_STORAGE_KEY);
      return;
    }

    const permission =
      Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;

    if (permission === "granted") {
      setNotificationsEnabled(true);
      window.localStorage.setItem(POMODORO_NOTIFICATIONS_STORAGE_KEY, "true");
      return;
    }

    setNotificationsEnabled(false);
    window.localStorage.removeItem(POMODORO_NOTIFICATIONS_STORAGE_KEY);
    setNotificationMessage("Notifications were blocked.");
  }

  async function transitionPhase(currentState: PomodoroTimerState) {
    if (transitionRef.current) {
      return;
    }

    transitionRef.current = true;
    const completedAt = new Date();

    if (currentState.phase === "focus") {
      const pausedSnapshot: PomodoroTimerState = {
        ...currentState,
        status: "paused",
        pausedAt: completedAt.toISOString()
      };

      setIsSaving(true);

      try {
        const session = await saveStudySession({
          started_at: pausedSnapshot.phaseStartedAt ?? completedAt.toISOString(),
          ended_at: completedAt.toISOString(),
          duration_seconds: pausedSnapshot.focusMinutes * 60,
          mode: "pomodoro"
        });

        onSessionSaved(session);
        notifyPhaseComplete("focus", currentState.phaseStartedAt);
        setFeedback(`Focus block complete. Saved ${formatDuration(pausedSnapshot.focusMinutes * 60)}.`);
        setState({
          ...pausedSnapshot,
          status: "running",
          phase: "break",
          phaseStartedAt: completedAt.toISOString(),
          pausedAt: null,
          accumulatedPausedMs: 0
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save the finished focus block.";
        setFeedback(message);
        setState(pausedSnapshot);
      } finally {
        setIsSaving(false);
        transitionRef.current = false;
      }

      return;
    }

    notifyPhaseComplete("break", currentState.phaseStartedAt);
    setFeedback("Break complete. Ready for the next focus block.");
    setState(createInitialPomodoroState(currentState.focusMinutes, currentState.breakMinutes));
    transitionRef.current = false;
  }

  useEffect(() => {
    if (state.status === "running" && remainingSeconds <= 0) {
      void transitionPhase(state);
    }
  }, [remainingSeconds, state]);

  function handleStart() {
    setFeedback(null);
    setNowMs(Date.now());

    if (state.status === "idle") {
      onStartGesture();
      setState((current) => ({
        ...current,
        status: "running",
        phaseStartedAt: new Date().toISOString(),
        pausedAt: null,
        accumulatedPausedMs: 0
      }));
      return;
    }

    if (state.status === "paused") {
      if (state.phase === "focus") {
        onStartGesture();
      }

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
  }

  function handlePause() {
    setFeedback(null);
    setState((current) => ({
      ...current,
      status: "paused",
      pausedAt: new Date().toISOString()
    }));
  }

  function handleReset() {
    setFeedback("Pomodoro reset.");
    setState(createInitialPomodoroState(state.focusMinutes, state.breakMinutes));
  }

  function handleDiscard() {
    const confirmed = window.confirm("Discard this current Pomodoro cycle without saving it?");

    if (!confirmed) {
      return;
    }

    setFeedback("Pomodoro cycle discarded.");
    setState(createInitialPomodoroState(state.focusMinutes, state.breakMinutes));
  }

  async function handleStopAndSave() {
    const endedAt = new Date();

    if (state.phase === "break") {
      setState(createInitialPomodoroState(state.focusMinutes, state.breakMinutes));
      setFeedback("Break ended without saving a session.");
      return;
    }

    const snapshot: PomodoroTimerState =
      state.status === "running"
        ? {
            ...state,
            status: "paused",
            pausedAt: endedAt.toISOString()
          }
        : state;

    const durationSeconds = getPomodoroElapsedSeconds(snapshot, endedAt.getTime());

    if (!durationSeconds) {
      setState(createInitialPomodoroState(state.focusMinutes, state.breakMinutes));
      return;
    }

    if (durationSeconds < 60) {
      const shouldSave = window.confirm(
        "This focus session is shorter than 60 seconds. Do you still want to save it?"
      );

      if (!shouldSave) {
        setState(createInitialPomodoroState(state.focusMinutes, state.breakMinutes));
        setFeedback("Short focus session discarded.");
        return;
      }
    }

    setState(snapshot);
    setIsSaving(true);
    setFeedback(null);

    try {
      const session = await saveStudySession({
        started_at: snapshot.phaseStartedAt ?? endedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        mode: "pomodoro"
      });

      onSessionSaved(session);
      setState(createInitialPomodoroState(state.focusMinutes, state.breakMinutes));
      setFeedback(`Saved ${formatDuration(durationSeconds)} from your focus block.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your focus block.";
      setFeedback(message);
      setState(snapshot);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="focusMinutes">Focus minutes</Label>
          <Input
            id="focusMinutes"
            type="number"
            min={1}
            max={180}
            value={state.focusMinutes}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                focusMinutes: Math.max(1, Number(event.target.value) || defaultFocusMinutes)
              }))
            }
            disabled={state.status !== "idle"}
          />
        </div>

        <div>
          <Label htmlFor="breakMinutes">Break minutes</Label>
          <Input
            id="breakMinutes"
            type="number"
            min={1}
            max={60}
            value={state.breakMinutes}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                breakMinutes: Math.max(1, Number(event.target.value) || defaultBreakMinutes)
              }))
            }
            disabled={state.status !== "idle"}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 font-medium capitalize">
            {state.phase} phase
          </span>
          <span>{state.phase === "focus" ? "Study with intention." : "Take a gentle break."}</span>
        </div>
        <div className="mt-4 text-[clamp(3rem,8vw,5.5rem)] font-semibold tracking-[-0.04em]">
          {formatClock(remainingSeconds)}
        </div>
        <CardDescription className="mt-3 max-w-lg">
          Completed focus blocks save automatically. Breaks never create sessions, and the current cycle survives a refresh.
        </CardDescription>
      </div>

      <div className="flex flex-wrap gap-3">
        {(state.status === "idle" || state.status === "paused") && (
          <Button size="lg" onClick={handleStart}>
            {state.status === "paused" ? "Resume" : "Start"}
          </Button>
        )}

        {state.status === "running" && (
          <Button size="lg" variant="secondary" onClick={handlePause}>
            Pause
          </Button>
        )}

        {(state.status === "running" || state.status === "paused") && (
          <Button size="lg" variant="outline" onClick={() => void handleStopAndSave()} disabled={isSaving}>
            {state.phase === "focus" ? (isSaving ? "Saving..." : "Stop & save") : "End break"}
          </Button>
        )}

        <Button size="lg" variant="ghost" onClick={handleReset}>
          Reset
        </Button>

        {(state.status === "running" || state.status === "paused") && (
          <Button size="lg" variant="ghost" onClick={handleDiscard} disabled={isSaving}>
            Discard
          </Button>
        )}

        <Button
          size="lg"
          variant="outline"
          onClick={() => void handleNotificationsClick()}
          disabled={!notificationsSupported}
        >
          {notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
        </Button>

        <Button size="lg" variant="outline" onClick={() => void openFloatingTimer()}>
          Floating timer
        </Button>
      </div>

      {floatingTimerMessage ? (
        <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">
          {floatingTimerMessage}
        </div>
      ) : null}

      {notificationMessage ? (
        <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">
          {notificationMessage}
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">{feedback}</div>
      ) : null}
    </div>
  );
}
