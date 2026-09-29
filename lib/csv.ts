import type { StudySession } from "@/types/database";
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  // Prevent spreadsheet formula execution when notes/subjects are opened in Excel.
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function sessionsCsv(sessions: StudySession[]) {
  return (
    "\ufeff" +
    [
      ["Started at (UTC)", "Ended at (UTC)", "Active seconds", "Mode", "Subject", "Notes"],
      ...sessions.map((s) => [s.started_at, s.ended_at, s.duration_seconds, s.mode, s.subject, s.note])
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
