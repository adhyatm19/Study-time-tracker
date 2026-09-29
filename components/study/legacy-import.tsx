"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Feedback } from "@/components/shared/feedback";
import { useStudy } from "./study-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { convertLegacyTimer, legacyTaskId } from "@/lib/legacy";
import { timerKey } from "@/lib/timer-engine";
import { errorMessage } from "@/lib/validation";
const keys = [
  "quiet-ledger:todos:v1",
  "quiet-ledger:today-goal:v1",
  "quiet-ledger:stopwatch",
  "quiet-ledger:pomodoro"
];
export function LegacyImport() {
  const s = useStudy();
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      setValues(
        Object.fromEntries(
          keys.flatMap((key) => {
            const value = localStorage.getItem(key);
            return value ? [[key, value]] : [];
          })
        )
      );
    } catch {
      /* Storage error is shown by the timer. */
    }
  }, []);
  async function recover(key: string) {
    setBusy(true);
    setMessage(null);
    try {
      await navigator.locks.request("quiet-ledger:legacy-import", async () => {
        const raw = localStorage.getItem(key);
        if (!raw) throw new Error("This data has already been recovered in another tab.");
        const db = createSupabaseBrowserClient();
        const {
          data: { user }
        } = await db.auth.getUser();
        if (user?.id !== s.profile.id)
          throw new Error("Sign into your account again before recovering data.");
        if (key.endsWith("todos:v1")) {
          const todos = JSON.parse(raw);
          if (!Array.isArray(todos)) throw new Error("The old task list could not be read.");
          for (const [index, todo] of todos.entries()) {
            if (
              !todo ||
              typeof todo.title !== "string" ||
              !todo.title.trim() ||
              todo.title.trim().length > 200
            )
              throw new Error("The old task list contains an invalid task. Download a backup for recovery.");
            const id = await legacyTaskId(s.profile.id, String(todo.id ?? `${index}:${todo.title}`));
            const { error } = await db.from("tasks").upsert(
              {
                id,
                user_id: s.profile.id,
                title: todo.title.trim(),
                completed: !!todo.completed
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
            if (error) throw error;
          }
        } else if (key.endsWith("today-goal:v1")) {
          const goal = JSON.parse(raw);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(goal.date) ||
            !Number.isInteger(goal.seconds) ||
            goal.seconds < 1 ||
            goal.seconds > 86400
          )
            throw new Error("The older goal is invalid. Download a backup for recovery.");
          const { error } = await db
            .from("daily_goals")
            .upsert(
              { user_id: s.profile.id, day: goal.date, seconds: goal.seconds },
              { onConflict: "user_id,day", ignoreDuplicates: true }
            );
          if (error) throw error;
        } else {
          await navigator.locks.request(timerKey(s.profile.id), async () => {
            const existing = localStorage.getItem(timerKey(s.profile.id));
            if (existing && JSON.parse(existing).status !== "idle")
              throw new Error("Finish or discard your current timer first.");
            const timer = convertLegacyTimer(
              raw,
              s.profile.id,
              key.endsWith("pomodoro") ? "pomodoro" : "stopwatch",
              crypto.randomUUID()
            );
            localStorage.setItem(timerKey(s.profile.id), JSON.stringify(timer));
            window.dispatchEvent(new StorageEvent("storage", { key: timerKey(s.profile.id) }));
          });
        }
        localStorage.removeItem(key);
        setValues((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        s.invalidate();
        setMessage("Recovered into this account. Any recovered timer is paused for review.");
      });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(values, null, 2)], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "quiet-ledger-legacy-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!Object.keys(values).length && !message) return null;
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Recover data from the earlier app</h2>
      <p className="text-sm text-muted-foreground">
        The earlier app stored tasks, goals, and timers without an account owner. Import only data that
        belongs to you. A recovered timer is paused; no study session is saved automatically.
      </p>
      <Button variant="outline" onClick={backup}>
        Download backup
      </Button>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        This browser’s older study data belongs to my account.
      </label>
      <div className="flex flex-wrap gap-2">
        {Object.keys(values).map((key) => (
          <Button
            key={key}
            variant="outline"
            disabled={!confirmed || busy || !s.ready}
            onClick={() => void recover(key)}
          >
            Recover{" "}
            {key.includes("todos")
              ? "tasks"
              : key.includes("goal")
                ? "daily goal"
                : key.endsWith("pomodoro")
                  ? "Pomodoro"
                  : "stopwatch"}
          </Button>
        ))}
      </div>
      <Feedback message={message} />
    </Card>
  );
}
