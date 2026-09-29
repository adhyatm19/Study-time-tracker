import { initialTimer, parseTimer, type TimerState } from "./timer-engine";
import { integerInRange } from "./validation";
export function convertLegacyTimer(
  raw: string,
  ownerId: string,
  mode: "stopwatch" | "pomodoro",
  id: string,
  now = Date.now()
): TimerState {
  const old = JSON.parse(raw);
  if (!old || !["running", "paused"].includes(old.status)) throw new Error("This older timer is not active.");
  const started = Date.parse(mode === "stopwatch" ? old.startedAt : old.phaseStartedAt);
  const end = old.status === "paused" ? Date.parse(old.pausedAt) : now;
  if (
    !Number.isFinite(started) ||
    !Number.isFinite(end) ||
    end < started ||
    !Number.isFinite(old.accumulatedPausedMs) ||
    old.accumulatedPausedMs < 0
  )
    throw new Error("The older timer contains invalid timestamps.");
  const focus = mode === "pomodoro" ? integerInRange(old.focusMinutes, 1, 180, "Focus") : 25;
  const rest = mode === "pomodoro" ? integerInRange(old.breakMinutes, 1, 60, "Break") : 5;
  const next: TimerState = {
    ...initialTimer(ownerId, focus, rest),
    id,
    mode,
    phase: old.phase === "break" ? "break" : "focus",
    status: "paused",
    startedAt: started,
    pausedAt: end,
    pausedMs: old.accumulatedPausedMs
  };
  const parsed = parseTimer(JSON.stringify(next), ownerId);
  if (!parsed) throw new Error("The older timer could not be recovered.");
  return parsed;
}
export async function legacyTaskId(ownerId: string, sourceId: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ownerId}:legacy-task:${sourceId}`))
  );
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
