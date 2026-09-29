"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2, Pause, Play, Timer, MoreHorizontal } from "lucide-react";
import { useStudy, PersistentAudio } from "./study-provider";
import { Button } from "@/components/shared/button";
import { Dialog } from "@/components/shared/dialog";
import { Feedback } from "@/components/shared/feedback";
import { Input, Label, Textarea } from "@/components/shared/input";
import { formatClock, formatDuration } from "@/lib/utils";
import { integerInRange, errorMessage } from "@/lib/validation";

export function PersistentTimer() {
  const s = useStudy();
  const pathname = usePathname();
  const full = pathname === "/dashboard";
  const [subjectDraft, setSubjectDraft] = useState(s.state.subject);
  useEffect(() => setSubjectDraft(s.state.subject), [s.state.subject]);
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [resetUnreadable, setResetUnreadable] = useState(false);
  const [focus, setFocus] = useState(String(s.state.focusMinutes));
  const [rest, setRest] = useState(String(s.state.breakMinutes));
  useEffect(() => {
    setFocus(String(s.state.focusMinutes));
    setRest(String(s.state.breakMinutes));
  }, [s.state.focusMinutes, s.state.breakMinutes]);
  useEffect(() => {
    if (s.review) {
      setSubject(s.state.subject);
      setNote(s.state.note);
    }
  }, [s.review, s.state.subject, s.state.note]);
  const active = s.state.status !== "idle";
  const pending = s.state.status === "pending";
  const disabled = s.busy || !s.ready || pending;
  const primary =
    s.state.status === "running" ? (
      <Button size="lg" className="min-w-36 gap-2" onClick={s.pause} disabled={disabled}>
        <Pause size={18} />
        Pause
      </Button>
    ) : (
      <Button
        size="lg"
        className="min-w-36 gap-2"
        onClick={() => {
          void (async () => {
            try {
              if (s.state.status === "idle") {
                await s.configure({
                  subject: subjectDraft,
                  focusMinutes: integerInRange(focus, 1, 180, "Focus minutes"),
                  breakMinutes: integerInRange(rest, 1, 60, "Break minutes")
                });
              }
              s.startOrResume();
            } catch (error) {
              s.setMessage(errorMessage(error));
            }
          })();
        }}
        disabled={disabled || s.state.status === "review"}
      >
        <Play size={18} />
        {active ? "Resume" : "Start focus"}
      </Button>
    );
  function setMinutes(kind: "focusMinutes" | "breakMinutes", value: string) {
    try {
      s.configure({
        [kind]: integerInRange(
          value,
          1,
          kind === "focusMinutes" ? 180 : 60,
          kind === "focusMinutes" ? "Focus minutes" : "Break minutes"
        )
      });
    } catch (error) {
      s.setMessage(errorMessage(error));
    }
  }
  return (
    <section aria-label="Study timer" className={full ? "mb-6" : "sticky top-0 z-20 mb-5"}>
      <div
        className={
          full
            ? "focus-panel rounded-[1.75rem] border border-border p-5 sm:p-8"
            : "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
        }
      >
        {full ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">A little time. All yours.</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Focus</h1>
            </div>
            <Button
              variant="ghost"
              aria-pressed={s.focused}
              onClick={() => s.setFocused(!s.focused)}
              className="gap-2"
            >
              {s.focused ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{" "}
              {s.focused ? "Exit focus mode" : "Focus mode"}
            </Button>
          </div>
        ) : (
          <Link href="/dashboard" className="text-sm font-medium">
            {active ? s.state.subject || "Current session" : "Ready to study"}{" "}
            <span className="ml-3 font-mono tabular-nums">{formatClock(s.seconds)}</span>
          </Link>
        )}
        <div className={full ? "mt-4 grid gap-7" : "contents"}>
          {full ? (
            <div className="order-2 mx-auto w-full max-w-lg space-y-4">
              <div className="timer-mode flex w-fit mx-auto" role="group" aria-label="Timer mode">
                {(["stopwatch", "pomodoro"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={s.state.mode === mode ? "primary" : "ghost"}
                    size="sm"
                    disabled={active || s.busy || !s.ready}
                    aria-pressed={s.state.mode === mode}
                    onClick={() => s.configure({ mode })}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
              <div>
                <Label htmlFor="session-subject">What are you working on?</Label>
                <Input
                  id="session-subject"
                  placeholder="e.g. Signals and systems · Chapter 4"
                  maxLength={120}
                  value={subjectDraft}
                  disabled={active || s.busy || !s.ready}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                />
              </div>
              {s.state.mode === "pomodoro" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="focus-minutes">Focus (minutes)</Label>
                    <Input
                      id="focus-minutes"
                      type="number"
                      min={1}
                      max={180}
                      step={1}
                      value={focus}
                      disabled={active || s.busy}
                      onChange={(e) => setFocus(e.target.value)}
                      onBlur={() => setMinutes("focusMinutes", focus)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="break-minutes">Break (minutes)</Label>
                    <Input
                      id="break-minutes"
                      type="number"
                      min={1}
                      max={60}
                      step={1}
                      value={rest}
                      disabled={active || s.busy}
                      onChange={(e) => setRest(e.target.value)}
                      onBlur={() => setMinutes("breakMinutes", rest)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Work at your own pace. Pause whenever you need to; only active time is saved.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {s.ready
                  ? "Recovered across refreshes on this browser. Saved sessions sync across devices."
                  : "Restoring your timer…"}
              </p>
            </div>
          ) : null}
          <div
            className={
              full ? "order-1 flex flex-col items-center gap-3" : "flex flex-wrap items-center gap-2"
            }
          >
            {full ? (
              <div className="timer-orbit text-center">
                <p className="mb-2 text-sm font-medium capitalize text-muted-foreground">
                  {pending
                    ? "Waiting to save"
                    : s.state.mode === "pomodoro"
                      ? `${s.state.phase} · ${s.state.status}`
                      : s.state.status === "idle"
                        ? "Ready when you are"
                        : s.state.status}
                </p>
                <p
                  role="timer"
                  aria-label={s.state.mode === "pomodoro" ? "Time remaining" : "Elapsed study time"}
                  className="timer-digits my-3"
                >
                  {formatClock(s.seconds)}
                </p>
                {s.state.mode === "pomodoro" ? (
                  <div
                    role="progressbar"
                    aria-label="Current phase progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(s.progress)}
                    className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full bg-accent" style={{ width: `${s.progress}%` }} />
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              {primary}
              {active ? (
                <Button size="lg" variant="outline" onClick={s.finish} disabled={s.busy || !s.ready}>
                  {pending ? "Review save" : s.state.phase === "break" ? "End break" : "Finish"}
                </Button>
              ) : null}
            </div>
            {full ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={!active || !s.ready}
                  onClick={() => void s.openFloatingTimer()}
                >
                  <Timer size={16} />
                  Floating timer
                </Button>
                <details className="relative">
                  <summary
                    aria-label="More timer options"
                    className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full hover:bg-muted"
                  >
                    <MoreHorizontal size={20} />
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-lifted">
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={() => void s.toggleNotifications()}
                      aria-pressed={s.notifications}
                    >
                      {s.notifications ? "Disable reminders" : "Enable reminders"}
                    </Button>
                    <Button
                      className="w-full text-red-700 dark:text-red-300"
                      variant="ghost"
                      disabled={!active || s.busy || pending}
                      onClick={() => setDiscardOpen(true)}
                    >
                      Discard session
                    </Button>
                  </div>
                </details>
              </div>
            ) : null}
          </div>
        </div>
        {!s.ready && s.message?.startsWith("Saved timer data") ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={s.backupTimer}>
              Back up timer
            </Button>
            <Button variant="ghost" onClick={() => setResetUnreadable(true)}>
              Reset unreadable timer
            </Button>
          </div>
        ) : null}
        {s.message || s.floatingTimerMessage ? (
          <div className={full ? "mt-4" : "w-full"}>
            <Feedback message={s.message || s.floatingTimerMessage} />
          </div>
        ) : null}
        {pending ? (
          <div className="mt-3 flex flex-wrap items-center gap-3" role="status">
            <p className="text-sm">Your session is kept on this device until saving succeeds.</p>
            <Button variant="outline" disabled={s.busy || !s.ready} onClick={s.retry}>
              {s.busy ? "Saving…" : "Retry save"}
            </Button>
          </div>
        ) : null}
        <div hidden={!full || s.focused} className="mt-6 border-t border-border/40 pt-4">
          <PersistentAudio />
        </div>
      </div>
      <Dialog open={s.review} title="Finish your session" busy={s.busy} onClose={s.cancelReview}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            s.save(subject, note);
          }}
        >
          <p className="text-3xl font-semibold">
            {formatDuration(s.state.pending?.seconds ?? s.elapsedSeconds)}
          </p>
          <p className="text-sm text-muted-foreground">
            Only active study time is counted.
            {s.elapsedSeconds < 60 ? " This is a short session; save it if it was intentional." : ""}
          </p>
          <div>
            <Label htmlFor="review-subject">Subject or task</Label>
            <Input
              id="review-subject"
              value={subject}
              maxLength={120}
              disabled={pending || s.busy}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="review-note">Notes (optional)</Label>
            <Textarea
              id="review-note"
              value={note}
              maxLength={2000}
              disabled={pending || s.busy}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you learn? What comes next?"
            />
          </div>
          <Feedback message={s.message} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={s.busy || !s.ready || s.elapsedSeconds < 1}>
              {s.busy ? "Saving…" : pending ? "Retry save" : "Save session"}
            </Button>
            {!pending ? (
              <Button variant="outline" disabled={s.busy} onClick={s.continueStudying}>
                Continue studying
              </Button>
            ) : null}
            <Button variant="ghost" disabled={s.busy} onClick={s.cancelReview}>
              Keep paused
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={resetUnreadable}
        title="Reset unreadable timer?"
        onClose={() => setResetUnreadable(false)}
      >
        <p className="mb-5 text-sm">
          Download a backup first if you need to recover this unsaved draft. Your saved sessions, tasks, and
          goals are unchanged.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResetUnreadable(false)}>
            Keep draft
          </Button>
          <Button
            onClick={() => {
              void s.resetUnreadable();
              setResetUnreadable(false);
            }}
          >
            Reset timer
          </Button>
        </div>
      </Dialog>
      <Dialog open={discardOpen} title="Discard this session?" onClose={() => setDiscardOpen(false)}>
        <p className="mb-5 text-sm">
          {formatDuration(s.elapsedSeconds)} of unsaved time will be removed. Previously saved sessions are
          kept.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDiscardOpen(false)}>
            Keep session
          </Button>
          <Button
            onClick={() => {
              s.discard();
              setDiscardOpen(false);
            }}
          >
            Discard
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
