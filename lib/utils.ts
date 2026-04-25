import { type Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

export function formatHours(totalSeconds: number) {
  return (totalSeconds / 3600).toFixed(1);
}

export function formatHoursMinutes(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function getDateRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

function toLocalDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLabel(value: Date, short = true) {
  return new Intl.DateTimeFormat("en-US", {
    month: short ? "short" : "long",
    day: "numeric"
  }).format(value);
}

export function aggregateSessionsByDay(sessions: SessionRow[], days: number) {
  const { start } = getDateRange(days);
  const totals = new Map<string, number>();

  sessions.forEach((session) => {
    const startedAt = new Date(session.started_at);
    if (startedAt < start) {
      return;
    }

    const key = toLocalDateKey(startedAt);
    totals.set(key, (totals.get(key) ?? 0) + session.duration_seconds);
  });

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const key = toLocalDateKey(current);
    const seconds = totals.get(key) ?? 0;

    return {
      date: key,
      label: toLabel(current),
      hours: Number((seconds / 3600).toFixed(1)),
      seconds
    };
  });
}

function getWeekStart(date: Date) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  return current;
}

export function aggregateWeeklyAverage(sessions: SessionRow[], weeks = 8) {
  const now = new Date();
  const firstWeek = getWeekStart(now);
  firstWeek.setDate(firstWeek.getDate() - (weeks - 1) * 7);

  const totals = new Map<string, number>();

  sessions.forEach((session) => {
    const startedAt = new Date(session.started_at);
    if (startedAt < firstWeek) {
      return;
    }

    const key = toLocalDateKey(getWeekStart(startedAt));
    totals.set(key, (totals.get(key) ?? 0) + session.duration_seconds);
  });

  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = new Date(firstWeek);
    weekStart.setDate(firstWeek.getDate() + index * 7);
    const key = toLocalDateKey(weekStart);
    const seconds = totals.get(key) ?? 0;

    return {
      week: key,
      label: toLabel(weekStart),
      hours: Number((seconds / 3600 / 7).toFixed(1)),
      totalHours: Number((seconds / 3600).toFixed(1))
    };
  });
}

export function calculateCurrentStreak(sessions: SessionRow[]) {
  const activeDays = new Set(
    sessions
      .filter((session) => session.duration_seconds > 0)
      .map((session) => toLocalDateKey(session.started_at))
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (activeDays.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function calculateRangeTotal(sessions: SessionRow[], range: "today" | "week" | "month" | "all") {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  }

  if (range === "week") {
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
  }

  if (range === "month") {
    start.setHours(0, 0, 0, 0);
    start.setDate(1);
  }

  return sessions.reduce((total, session) => {
    if (range === "all") {
      return total + session.duration_seconds;
    }

    return new Date(session.started_at) >= start ? total + session.duration_seconds : total;
  }, 0);
}
