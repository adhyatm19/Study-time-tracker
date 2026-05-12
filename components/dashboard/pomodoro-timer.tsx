"use client";

import { Bell, Pause, Play, RotateCcw, Square, TimerIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/shared/button";
import { Input, Label } from "@/components/shared/input";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  createInitialPomodoroState,
  getPomodoroPhaseDurationSeconds,
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
  const elapsedSeconds = useMemo(() => getPomodoroElapsedSeconds(state, nowMs), [nowMs, state]);
  const phaseDurationSeconds = useMemo(() => getPomodoroPhaseDurationSeconds(state), [state]);
  const progressDegrees = phaseDurationSeconds
    ? Math.min(360, Math.max(0, (elapsedSeconds / phaseDurationSeconds) * 360))
    : 0;
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
        mode: "pomodoro",
        note: (window.prompt("What did you study?")?.trim() ?? "") || null
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
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full gap-4 md:grid-cols-2">
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

      <div
        className="grid aspect-square w-full max-w-[25rem] place-items-center rounded-full p-2 shadow-inner"
        style={{
          background: `conic-gradient(hsl(var(--accent) / ${
            state.status === "idle" ? 0.22 : 0.72
          }) ${progressDegrees}deg, hsl(var(--muted)) ${progressDegrees}deg 360deg)`
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-card/90 p-6">
          <div className="text-center">
            <p className="text-sm font-medium capitalize text-muted-foreground">{state.phase} phase</p>
            <div className="mt-4 font-mono text-5xl font-semibold leading-none sm:text-6xl">
              {formatClock(remainingSeconds)}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {state.phase === "focus" ? "Study with intention." : "Take a gentle break."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        {(state.status === "idle" || state.status === "paused") && (
          <Button size="lg" className="gap-2 sm:min-w-36" onClick={handleStart}>
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {state.status === "paused" ? "Resume" : "Start"}
          </Button>
        )}

        {state.status === "running" && (
          <Button size="lg" className="gap-2 sm:min-w-36" onClick={handlePause}>
            <Pause className="h-4 w-4" aria-hidden="true" />
            Pause
          </Button>
        )}

        {(state.status === "running" || state.status === "paused") && (
          <Button
            size="lg"
            className="gap-2 sm:min-w-36"
            onClick={() => void handleStopAndSave()}
            disabled={isSaving}
          >
            {isSaving ? <LoadingSpinner /> : <Square className="h-4 w-4" aria-hidden="true" />}
            {state.phase === "focus" ? (isSaving ? "Saving..." : "Stop & save") : "End break"}
          </Button>
        )}

        <Button size="md" variant="outline" className="gap-2 sm:h-11" onClick={() => void openFloatingTimer()}>
          <TimerIcon className="h-4 w-4" aria-hidden="true" />
          Float
        </Button>

        <Button size="md" variant="ghost" className="gap-2 sm:h-11" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </Button>

        {(state.status === "running" || state.status === "paused") && (
          <Button size="md" variant="ghost" className="gap-2 sm:h-11" onClick={handleDiscard} disabled={isSaving}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Discard
          </Button>
        )}

        <Button
          size="md"
          variant="outline"
          className="gap-2 sm:h-11"
          onClick={() => void handleNotificationsClick()}
          disabled={!notificationsSupported}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {notificationsEnabled ? "Notifications on" : "Notify"}
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
