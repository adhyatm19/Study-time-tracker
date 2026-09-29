import { integerInRange } from "./validation";

export type TimerMode = "stopwatch" | "pomodoro";
export type TimerStatus = "idle" | "running" | "paused" | "review" | "pending";
export type TimerState = {
  version: 2;
  ownerId: string;
  id: string | null;
  mode: TimerMode;
  phase: "focus" | "break";
  status: TimerStatus;
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  focusMinutes: number;
  breakMinutes: number;
  taskId: string | null;
  subject: string;
  note: string;
  pending: { endedAt: number; seconds: number; completed: boolean } | null;
};
export const MAX_SESSION_SECONDS = 86400;
export function timerKey(userId: string) {
  return `quiet-ledger:${userId}:timer:v2`;
}
export function initialTimer(ownerId: string, focusMinutes = 25, breakMinutes = 5): TimerState {
  return {
    version: 2,
    ownerId,
    id: null,
    mode: "stopwatch",
    phase: "focus",
    status: "idle",
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    focusMinutes,
    breakMinutes,
    taskId: null,
    subject: "",
    note: "",
    pending: null
  };
}
export function elapsed(state: TimerState, now = Date.now()) {
  if (state.startedAt === null) return 0;
  const end = state.pausedAt ?? now;
  return Math.min(
    MAX_SESSION_SECONDS,
    Math.max(0, Math.floor((end - state.startedAt - state.pausedMs) / 1000))
  );
}
export function duration(state: TimerState) {
  return (state.phase === "break" ? state.breakMinutes : state.focusMinutes) * 60;
}
export function remaining(state: TimerState, now = Date.now()) {
  return Math.max(0, duration(state) - elapsed(state, now));
}
export function pause(state: TimerState, now: number): TimerState {
  return state.status === "running" ? { ...state, status: "paused", pausedAt: now } : state;
}
export function resume(state: TimerState, now: number): TimerState {
  if (!["paused", "review"].includes(state.status) || state.pausedAt === null) return state;
  return {
    ...state,
    status: "running",
    pausedMs: state.pausedMs + Math.max(0, now - state.pausedAt),
    pausedAt: null
  };
}
export function start(state: TimerState, id: string, now: number): TimerState {
  if (state.status !== "idle") return state;
  integerInRange(state.focusMinutes, 1, 180, "Focus minutes");
  integerInRange(state.breakMinutes, 1, 60, "Break minutes");
  return {
    ...state,
    id,
    status: "running",
    phase: "focus",
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
    pending: null,
    note: ""
  };
}
export function prepareSave(state: TimerState, now: number, completed = false): TimerState {
  if (!state.id || state.startedAt === null || state.phase !== "focus")
    throw new Error("No focus session to save.");
  if (state.pending) return state;
  const seconds =
    state.mode === "pomodoro" ? Math.min(duration(state), elapsed(state, now)) : elapsed(state, now);
  if (seconds < 1) throw new Error("Study for at least one second before saving.");
  // Use the actual deadline when a suspended tab wakes after a focus block ended.
  const endedAt = completed ? state.startedAt + state.pausedMs + seconds * 1000 : (state.pausedAt ?? now);
  return { ...state, status: "pending", pausedAt: endedAt, pending: { endedAt, seconds, completed } };
}
export function afterSave(state: TimerState, now: number): TimerState {
  if (state.pending?.completed && state.mode === "pomodoro") {
    return {
      ...state,
      id: null,
      phase: "break",
      status: "running",
      startedAt: now,
      pausedAt: null,
      pausedMs: 0,
      pending: null,
      note: ""
    };
  }
  return {
    ...initialTimer(state.ownerId, state.focusMinutes, state.breakMinutes),
    mode: state.mode,
    taskId: state.taskId,
    subject: state.subject
  };
}
export function parseTimer(raw: string | null, ownerId: string): TimerState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as TimerState;
    const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
    const uuid = (v: unknown) =>
      typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    if (
      !s ||
      s.version !== 2 ||
      s.ownerId !== ownerId ||
      !["idle", "running", "paused", "review", "pending"].includes(s.status) ||
      !["stopwatch", "pomodoro"].includes(s.mode) ||
      !["focus", "break"].includes(s.phase) ||
      !finite(s.pausedMs) ||
      typeof s.subject !== "string" ||
      s.subject.length > 120 ||
      typeof s.note !== "string" ||
      s.note.length > 2000 ||
      (s.taskId !== null && !uuid(s.taskId)) ||
      (s.id !== null && !uuid(s.id))
    )
      return null;
    integerInRange(s.focusMinutes, 1, 180, "Focus");
    integerInRange(s.breakMinutes, 1, 60, "Break");
    if (s.status !== "idle" && (!finite(s.startedAt) || (s.phase === "focus" && !uuid(s.id)))) return null;
    if (
      ["paused", "review", "pending"].includes(s.status) &&
      (!finite(s.pausedAt) || s.pausedAt < (s.startedAt ?? 0))
    )
      return null;
    if (s.status === "running" && s.pausedAt !== null) return null;
    if (s.status !== "idle" && s.pausedMs > (s.pausedAt ?? Date.now()) - (s.startedAt ?? 0)) return null;
    if (s.status === "pending") {
      if (!s.pending || !finite(s.pending.endedAt) || typeof s.pending.completed !== "boolean") return null;
      integerInRange(s.pending.seconds, 1, MAX_SESSION_SECONDS, "Duration");
      if (
        s.pending.endedAt < (s.startedAt ?? 0) ||
        s.pending.seconds * 1000 > s.pending.endedAt - (s.startedAt ?? 0) + 1000
      )
        return null;
    } else if (s.pending !== null) return null;
    return s;
  } catch {
    return null;
  }
}
