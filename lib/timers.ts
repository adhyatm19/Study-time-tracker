export type StopwatchStatus = "idle" | "running" | "paused";
export type PomodoroStatus = "idle" | "running" | "paused";
export type PomodoroPhase = "focus" | "break";

export const STOPWATCH_STORAGE_KEY = "quiet-ledger:stopwatch";
export const POMODORO_STORAGE_KEY = "quiet-ledger:pomodoro";

export interface StopwatchTimerState {
  status: StopwatchStatus;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedPausedMs: number;
}

export interface PomodoroTimerState {
  status: PomodoroStatus;
  phase: PomodoroPhase;
  focusMinutes: number;
  breakMinutes: number;
  phaseStartedAt: string | null;
  pausedAt: string | null;
  accumulatedPausedMs: number;
}

export const initialStopwatchState: StopwatchTimerState = {
  status: "idle",
  startedAt: null,
  pausedAt: null,
  accumulatedPausedMs: 0
};

export function createInitialPomodoroState(focusMinutes: number, breakMinutes: number): PomodoroTimerState {
  return {
    status: "idle",
    phase: "focus",
    focusMinutes,
    breakMinutes,
    phaseStartedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0
  };
}

function parseTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

export function getElapsedSeconds(state: StopwatchTimerState, nowMs = Date.now()) {
  if (!state.startedAt) {
    return 0;
  }

  const startMs = parseTimestamp(state.startedAt);
  const effectiveEndMs = state.status === "paused" && state.pausedAt ? parseTimestamp(state.pausedAt) : nowMs;
  const elapsedMs = Math.max(0, effectiveEndMs - startMs - state.accumulatedPausedMs);

  return Math.floor(elapsedMs / 1000);
}

export function getPomodoroPhaseDurationSeconds(state: PomodoroTimerState) {
  return (state.phase === "focus" ? state.focusMinutes : state.breakMinutes) * 60;
}

export function getPomodoroElapsedSeconds(state: PomodoroTimerState, nowMs = Date.now()) {
  if (!state.phaseStartedAt) {
    return 0;
  }

  const startedMs = parseTimestamp(state.phaseStartedAt);
  const effectiveEndMs = state.status === "paused" && state.pausedAt ? parseTimestamp(state.pausedAt) : nowMs;
  const elapsedMs = Math.max(0, effectiveEndMs - startedMs - state.accumulatedPausedMs);

  return Math.floor(elapsedMs / 1000);
}

export function getPomodoroRemainingSeconds(state: PomodoroTimerState, nowMs = Date.now()) {
  if (!state.phaseStartedAt && state.status === "idle") {
    return getPomodoroPhaseDurationSeconds(state);
  }

  return Math.max(0, getPomodoroPhaseDurationSeconds(state) - getPomodoroElapsedSeconds(state, nowMs));
}
