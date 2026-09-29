"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStudy } from "./study-provider";
import { useResource } from "./use-resource";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/utils";
import { integerInRange, errorMessage } from "@/lib/validation";
import { sessionsCsv } from "@/lib/csv";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Dialog } from "@/components/shared/dialog";
import { Input, Label, Select, Textarea } from "@/components/shared/input";
import { Feedback, LoadError } from "@/components/shared/feedback";
import type { StudySession } from "@/types/database";

type Filters = { search: string; from: string; to: string };
const emptyFilters: Filters = { search: "", from: "", to: "" };
function localInput(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}
export function SessionHistory({ compact = false }: { compact?: boolean }) {
  const s = useStudy();
  const [filters, setFilters] = useState(emptyFilters);
  const [draft, setDraft] = useState(emptyFilters);
  const [extra, setExtra] = useState<StudySession[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [remove, setRemove] = useState<StudySession | null>(null);
  const [editor, setEditor] = useState<StudySession | "new" | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [seconds, setSeconds] = useState("");
  const [mode, setMode] = useState<"stopwatch" | "pomodoro">("stopwatch");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const generation = useRef(0);
  const manualId = useRef<string | null>(null);
  const pageSize = compact ? 4 : 50;
  const fetchPage = useCallback(
    async (cursor?: StudySession, size = pageSize) => {
      const { data, error } = await createSupabaseBrowserClient().rpc("get_session_history", {
        after_start: cursor?.started_at,
        after_id: cursor?.id,
        filter_start: filters.from || undefined,
        filter_end: filters.to || undefined,
        search_text: filters.search,
        page_size: size
      });
      if (error) throw error;
      return data;
    },
    [filters, pageSize]
  );
  const load = useCallback(() => fetchPage(), [fetchPage]);
  const resource = useResource(load);
  useEffect(() => {
    generation.current++;
    setExtra([]);
    setHasMore(resource.data?.length === pageSize);
  }, [resource.data, pageSize]);
  const rows = [...(resource.data ?? []), ...extra];
  async function more() {
    const request = generation.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(rows.at(-1));
      if (request === generation.current) {
        setExtra((current) => [...current, ...page]);
        setHasMore(page.length === pageSize);
      }
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }
  function openEditor(session: StudySession | "new") {
    manualId.current = session === "new" ? crypto.randomUUID() : null;
    setEditor(session);
    setFeedback(null);
    const end = new Date();
    const start = new Date(end.getTime() - 25 * 60000);
    setStartTime(localInput(session === "new" ? start.toISOString() : session.started_at));
    setEndTime(localInput(session === "new" ? end.toISOString() : session.ended_at));
    setSeconds(String(session === "new" ? 1500 : session.duration_seconds));
    setMode(session === "new" ? "stopwatch" : session.mode);
    setSubject(session === "new" ? "" : (session.subject ?? ""));
    setNote(session === "new" ? "" : (session.note ?? ""));
  }
  async function saveEdit() {
    setBusy(true);
    setFeedback(null);
    try {
      const duration = integerInRange(seconds, 1, 86400, "Active seconds");
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
        throw new Error("End time must be after start time.");
      if (end.getTime() > Date.now() + 60000) throw new Error("End time cannot be in the future.");
      if (duration * 1000 > end.getTime() - start.getTime() + 1000)
        throw new Error("Active time cannot exceed the session’s clock time.");
      const db = createSupabaseBrowserClient();
      const payload = {
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        duration_seconds: duration,
        mode,
        subject: subject.trim() || null,
        note: note.trim() || null
      };
      const result =
        editor === "new"
          ? await db.rpc("save_study_session", {
              session_id: manualId.current!,
              session_start: payload.started_at,
              session_end: payload.ended_at,
              seconds: duration,
              timer_mode: mode,
              session_subject: payload.subject,
              session_note: payload.note
            })
          : await db.from("study_sessions").update(payload).eq("id", editor!.id).select("id").single();
      if (result.error) throw result.error;
      setEditor(null);
      s.invalidate();
      resource.refresh();
      setFeedback("Session saved.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function deleteSession() {
    if (!remove) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await createSupabaseBrowserClient()
        .from("study_sessions")
        .delete()
        .eq("id", remove.id);
      if (error) throw error;
      setRemove(null);
      s.invalidate();
      resource.refresh();
      setFeedback("Session deleted.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function exportCsv() {
    setBusy(true);
    setFeedback(null);
    try {
      const all: StudySession[] = [];
      let cursor: StudySession | undefined;
      for (;;) {
        const page = await fetchPage(cursor, 500);
        all.push(...page);
        if (page.length < 500) break;
        cursor = page.at(-1);
      }
      const url = URL.createObjectURL(new Blob([sessionsCsv(all)], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `quiet-ledger-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`Exported ${all.length} sessions matching your filters.`);
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (resource.error) return <LoadError label="Session history" onRetry={resource.refresh} />;
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: s.profile.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{compact ? "Recent sessions" : "Your sessions"}</h2>
        {compact ? (
          <Link href="/history" className="text-sm font-medium text-accent underline underline-offset-4">
            View all
          </Link>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy || resource.loading} onClick={() => void exportCsv()}>
              Export CSV
            </Button>
            <Button onClick={() => openEditor("new")} disabled={busy}>
              Add session
            </Button>
          </div>
        )}
      </div>
      {!compact ? (
        <form
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.from && draft.to && draft.from > draft.to) {
              setFeedback("Choose an end date on or after the start date.");
              return;
            }
            setFilters(draft);
            setFeedback(null);
          }}
        >
          <div>
            <Label htmlFor="history-search">Subject or notes</Label>
            <Input
              id="history-search"
              type="search"
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="history-from">From</Label>
            <Input
              id="history-from"
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="history-to">Through</Label>
            <Input
              id="history-to"
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </div>
          <Button className="self-end" type="submit">
            Filter
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-4">
            Dates and filters use {s.profile.timezone}.
          </p>
        </form>
      ) : null}
      <div className="mt-4">
        <Feedback message={feedback} />
      </div>
      {resource.loading && !resource.data ? (
        <p role="status" className="py-5 text-sm">
          Loading sessions…
        </p>
      ) : !rows.length ? (
        <p className="py-6 text-sm text-muted-foreground">
          {filters.search || filters.from || filters.to
            ? "No sessions match these filters."
            : "Your saved sessions will appear here."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">
                  {row.subject || `${row.mode === "pomodoro" ? "Pomodoro" : "Stopwatch"} session`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatter.format(new Date(row.started_at))} · {formatDuration(row.duration_seconds)}
                </p>
                {row.note ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {row.note}
                  </p>
                ) : null}
              </div>
              {!compact ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${row.subject || "session"} from ${formatter.format(new Date(row.started_at))}`}
                    onClick={() => openEditor(row)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFeedback(null);
                      setRemove(row);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!compact && hasMore ? (
        <Button className="mt-4" variant="outline" disabled={loadingMore} onClick={() => void more()}>
          {loadingMore ? "Loading…" : "Load more sessions"}
        </Button>
      ) : null}
      <Dialog
        open={!!editor}
        title={editor === "new" ? "Add a study session" : "Edit study session"}
        busy={busy}
        onClose={() => setEditor(null)}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEdit();
          }}
        >
          <p className="text-xs text-muted-foreground">
            Time inputs use your device timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Active
            seconds exclude pauses.
          </p>
          <div>
            <Label htmlFor="edit-subject">Subject</Label>
            <Input
              id="edit-subject"
              value={subject}
              maxLength={120}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-start">Started</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                step={1}
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-end">Ended</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                step={1}
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-seconds">Active seconds</Label>
              <Input
                id="edit-seconds"
                type="number"
                min={1}
                max={86400}
                step={1}
                required
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-mode">Mode</Label>
              <Select id="edit-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="stopwatch">Stopwatch</option>
                <option value="pomodoro">Pomodoro</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Feedback message={feedback} />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save session"}
          </Button>
        </form>
      </Dialog>
      <Dialog open={!!remove} title="Delete saved session?" busy={busy} onClose={() => setRemove(null)}>
        <p className="mb-4 text-sm">
          This removes {formatDuration(remove?.duration_seconds ?? 0)} from your study totals. This cannot be
          undone.
        </p>
        <Feedback message={feedback} />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setRemove(null)} disabled={busy}>
            Keep session
          </Button>
          <Button onClick={() => void deleteSession()} disabled={busy}>
            {busy ? "Deleting…" : "Delete session"}
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
