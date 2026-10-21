"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Pause, Play, Timer, MoreHorizontal } from "lucide-react";
import { useStudy, PersistentAudio } from "./study-provider";
import { TimerRing } from "./timer-ring";
import { Button } from "@/components/shared/button";
import { Dialog } from "@/components/shared/dialog";
import { Feedback } from "@/components/shared/feedback";
import { Input, Label, Textarea } from "@/components/shared/input";
import { formatClock, formatDuration } from "@/lib/utils";
import { integerInRange, errorMessage } from "@/lib/validation";

const PRESETS = [
  { focus: 25, rest: 5 },
  { focus: 50, rest: 10 },
  { focus: 90, rest: 15 }
];

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
  const [customOpen, setCustomOpen] = useState(false);
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
  const onBreak = s.state.mode === "pomodoro" && s.state.phase === "break";
  const clock = formatClock(s.seconds).replace(/^00:/, "");
  const status = !s.ready
    ? "Restoring"
    : pending
      ? "Waiting to save"
      : s.state.status === "review"
        ? "Reviewing"
        : s.state.status === "paused"
          ? "Paused"
          : s.state.status === "running"
            ? onBreak
              ? "On break"
              : s.state.mode === "pomodoro"
                ? "Focusing"
                : "Studying"
            : "Ready";
  const statusTone =
    s.state.status === "running"
      ? onBreak
        ? "tone-green"
        : "tone-blue"
      : s.state.status === "paused"
        ? "tone-peach"
        : "";
  const ringProgress = s.state.mode === "pomodoro" ? s.progress : active ? ((s.seconds % 60) / 60) * 100 : 0;
  const preset = PRESETS.find((p) => p.focus === s.state.focusMinutes && p.rest === s.state.breakMinutes);
  const showCustom = customOpen || !preset;
  const canStart = !disabled && s.state.status !== "review";
  function begin() {
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
  }
  // Keep the latest handler without rebinding the listener on every tick.
  const shortcut = useRef<(event: KeyboardEvent) => void>(() => {});
  shortcut.current = (event) => {
    if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.querySelector("dialog[open]")) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, button, a, summary, [contenteditable='true']")) return;
    if (event.key === " ") {
      event.preventDefault();
      if (s.state.status === "running") {
        if (!disabled) s.pause();
      } else if (canStart) begin();
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      s.setFocused(!s.focused);
    } else if (event.key === "Escape" && s.focused) {
      s.setFocused(false);
    }
  };
  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => shortcut.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  useEffect(() => {
    if (!active || !s.ready) return;
    const previous = document.title;
    document.title = `${clock} · ${status}`;
    return () => {
      document.title = previous;
    };
  }, [active, s.ready, clock, status]);
  const primary =
    s.state.status === "running" ? (
      <Button size="lg" className="min-w-36 gap-2" onClick={s.pause} disabled={disabled}>
        <Pause size={18} />
        Pause
      </Button>
    ) : (
      <Button size="lg" className="min-w-36 gap-2" onClick={begin} disabled={!canStart}>
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
  const shortcutHint = (
    <p className="hidden text-xs leading-5 text-muted-foreground [@media(pointer:fine)]:block">
      <kbd className="kbd">Space</kbd> start or pause · <kbd className="kbd">F</kbd> focus mode
      {s.focused ? (
        <>
          {" "}
          · <kbd className="kbd">Esc</kbd> exit
        </>
      ) : null}
    </p>
  );
  return (
    <section aria-label="Study timer" className={full ? "mb-6" : "sticky top-0 z-20 mb-5"}>
      <div
        className={
          full
            ? `focus-panel rounded-[22px] border border-border p-5 sm:p-6 ${s.focused ? "is-focused" : ""}`
            : "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
        }
      >
        {full ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {s.focused ? (
              <span />
            ) : (
              <div>
                <p className="eyebrow">A little progress, every day.</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Focus session</h1>
              </div>
            )}
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
        <div className={full ? "focus-layout" : "contents"}>
          <div className={full ? "focus-clock" : "flex flex-wrap items-center gap-2"}>
            {full ? (
              <>
                {!s.focused ? (
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
                ) : null}
                {s.focused && s.state.subject ? (
                  <p className="max-w-xl text-center text-lg font-medium tracking-tight text-muted-foreground">
                    {s.state.subject}
                  </p>
                ) : null}
                <TimerRing progress={ringProgress} tone={onBreak ? "break" : "focus"}>
                  <span
                    className={`status-pill ${statusTone}`}
                    data-running={s.state.status === "running" || undefined}
                  >
                    <span className="status-dot" aria-hidden="true" />
                    {status}
                  </span>
                  <p
                    role="timer"
                    aria-label={s.state.mode === "pomodoro" ? "Time remaining" : "Elapsed study time"}
                    className="ring-digits"
                    data-long={clock.length > 5 || undefined}
                  >
                    {clock}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.state.mode === "pomodoro"
                      ? `of ${onBreak ? s.state.breakMinutes : s.state.focusMinutes} min ${onBreak ? "break" : "focus"}`
                      : active
                        ? "active study time"
                        : "stopwatch"}
                  </p>
                </TimerRing>
              </>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              {primary}
              {active ? (
                <Button size="lg" variant="outline" onClick={s.finish} disabled={s.busy || !s.ready}>
                  {pending ? "Review save" : s.state.phase === "break" ? "End break" : "Finish"}
                </Button>
              ) : null}
            </div>
            {full && s.focused ? shortcutHint : null}
            {full && !s.focused ? (
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
                  <div className="native-popover absolute right-0 z-30 mt-2 w-56 rounded-xl border border-border/60 bg-card p-2">
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
          {full && !s.focused ? (
            <div className="focus-settings">
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
                <div className="space-y-3">
                  <div>
                    <p id="preset-label" className="mb-2 text-[13px] font-medium">
                      Session length
                    </p>
                    <div role="group" aria-labelledby="preset-label" className="flex flex-wrap gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.focus}
                          type="button"
                          className="preset-chip"
                          aria-pressed={!showCustom && preset === p}
                          aria-label={`${p.focus} minute focus, ${p.rest} minute break`}
                          disabled={active || s.busy || !s.ready}
                          onClick={() => {
                            setCustomOpen(false);
                            void s.configure({ focusMinutes: p.focus, breakMinutes: p.rest });
                          }}
                        >
                          {p.focus}
                          <span className="text-muted-foreground">/{p.rest}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="preset-chip"
                        aria-pressed={showCustom}
                        disabled={active || s.busy || !s.ready}
                        onClick={() => setCustomOpen(true)}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                  {showCustom ? (
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
                  ) : null}
                </div>
              ) : (
                <p className="text-[13px] leading-5 text-muted-foreground">
                  Work at your own pace. Pause whenever you need to; only active time is saved.
                </p>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                {s.ready
                  ? "Your timer stays here when you refresh. Saved sessions sync across devices."
                  : "Restoring your timer…"}
              </p>
              {shortcutHint}
            </div>
          ) : null}
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
        <div hidden={!full || s.focused} className="mt-5 border-t border-border/40 pt-3">
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
