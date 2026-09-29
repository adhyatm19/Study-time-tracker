"use client";
import { useCallback, useEffect, useState } from "react";
import { Target } from "lucide-react";
import { useStudy } from "./study-provider";
import { useResource } from "./use-resource";
import { useSummary } from "./summary-view";
import { dateInZone } from "@/lib/summary";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { integerInRange, errorMessage } from "@/lib/validation";
import { formatDuration } from "@/lib/utils";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input, Label } from "@/components/shared/input";
import { Feedback, LoadError } from "@/components/shared/feedback";
export function DailyGoal() {
  const s = useStudy();
  const day = dateInZone(s.profile.timezone, new Date(s.now));
  const summary = useSummary();
  const load = useCallback(async () => {
    const { data, error } = await createSupabaseBrowserClient()
      .from("daily_goals")
      .select("*")
      .eq("user_id", s.profile.id)
      .eq("day", day)
      .maybeSingle();
    if (error) throw error;
    return { seconds: data?.seconds ?? null };
  }, [s.profile.id, day]);
  const goal = useResource(load);
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState("120");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [day]);
  useEffect(() => {
    if (goal.data?.seconds) setMinutes(String(Math.round(goal.data.seconds / 60)));
  }, [goal.data]);
  async function save(clear = false) {
    setBusy(true);
    setError(null);
    try {
      const db = createSupabaseBrowserClient();
      const result = clear
        ? await db.from("daily_goals").delete().eq("user_id", s.profile.id).eq("day", day)
        : await db.from("daily_goals").upsert({
            user_id: s.profile.id,
            day,
            seconds: integerInRange(minutes, 1, 1440, "Goal minutes") * 60
          });
      if (result.error) throw result.error;
      setEditing(false);
      goal.refresh();
      s.invalidate();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (goal.error) return <LoadError label="Daily goal" onRetry={goal.refresh} />;
  const seconds = goal.data?.seconds;
  const studied = summary.data?.today_seconds ?? 0;
  const progress = seconds ? Math.min(100, Math.round((studied / seconds) * 100)) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="section-icon tone-green">
            <Target size={17} aria-hidden="true" />
          </span>
          <h2 className="text-[15px] font-semibold tracking-tight">Today’s goal</h2>
        </div>
        {seconds && !editing ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>
      {goal.loading && !goal.data ? (
        <p className="mt-3 text-sm" role="status">
          Loading goal…
        </p>
      ) : seconds && !editing ? (
        <div className="mt-4 space-y-3">
          {summary.error ? (
            <LoadError label="Goal progress" onRetry={summary.refresh} />
          ) : (
            <>
              <p className="text-lg font-semibold tabular-nums tracking-tight">
                {formatDuration(studied)} of {formatDuration(seconds)}
              </p>
              <progress
                className="h-2.5 w-full accent-[hsl(var(--accent))]"
                max={100}
                value={progress}
                aria-label="Daily study goal"
              />
              <p className="text-sm text-muted-foreground">
                {progress === 100
                  ? "Goal met. Take a moment to appreciate your work."
                  : `${formatDuration(Math.max(0, seconds - studied))} left today`}
              </p>
            </>
          )}
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Label htmlFor="goal-minutes">Target study minutes</Label>
          <Input
            id="goal-minutes"
            type="number"
            min={1}
            max={1440}
            step={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save goal"}
            </Button>
            {seconds ? (
              <>
                <Button variant="outline" disabled={busy} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void save(true)}>
                  Clear
                </Button>
              </>
            ) : null}
          </div>
        </form>
      )}
      <div className="mt-3">
        <Feedback error message={error} />
      </div>
    </Card>
  );
}
