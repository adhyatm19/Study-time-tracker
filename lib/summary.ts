import type { Json } from "@/types/database";
export type DailyTotal = { date: string; seconds: number };
export type StudySummary = {
  timezone: string;
  today: string;
  total_seconds: number;
  first_day: string | null;
  today_seconds: number;
  week_seconds: number;
  month_seconds: number;
  current_streak: number;
  best_streak: number;
  days: DailyTotal[];
};
export type Group = {
  id: string;
  name: string;
  is_owner: boolean;
  member_count: number;
  invite: { token: string; expires_at: string } | null;
};
export function parseSummary(data: Json): StudySummary {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.days) ||
    typeof data.today !== "string" ||
    typeof data.total_seconds !== "number"
  )
    throw new Error("Study summary is unavailable.");
  return data as StudySummary;
}
export function parseGroup(data: Json): Group | null {
  if (data === null) return null;
  if (
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.id !== "string" ||
    typeof data.name !== "string"
  )
    throw new Error("Group details are unavailable.");
  return data as Group;
}
export function dateInZone(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}
export function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}
export function chartDays(days: DailyTotal[], length: number) {
  return days.slice(-length).map((day) => ({ ...day, label: dayLabel(day.date), hours: day.seconds / 3600 }));
}
export function weeklyChart(summary: StudySummary) {
  const weeks = new Map<string, { seconds: number; count: number }>();
  for (const day of summary.days) {
    const d = new Date(`${day.date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    const row = weeks.get(key) ?? { seconds: 0, count: 0 };
    row.seconds += day.seconds;
    row.count++;
    weeks.set(key, row);
  }
  // Drop the incomplete earliest week; the current week uses elapsed calendar days.
  return [...weeks]
    .filter(([, week], index) => index !== 0 || week.count === 7)
    .map(([date, week]) => ({
      label: dayLabel(date),
      hours: week.seconds / week.count / 3600,
      seconds: week.seconds / week.count
    }));
}
