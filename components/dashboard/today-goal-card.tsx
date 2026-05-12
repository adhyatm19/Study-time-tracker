"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { RotateCcw, Target } from "lucide-react";

import { Button } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { Input, Label } from "@/components/shared/input";
import { formatStudyDuration } from "@/lib/utils";

interface TodayGoalCardProps {
  goalSeconds: number | null;
  todayStudySeconds: number;
  onGoalChange: (goalSeconds: number | null) => void;
}

function splitGoalSeconds(goalSeconds: number | null) {
  const safeSeconds = Math.max(0, goalSeconds ?? 0);

  return {
    hours: Math.floor(safeSeconds / 3600).toString(),
    minutes: Math.floor((safeSeconds % 3600) / 60).toString()
  };
}

export function TodayGoalCard({ goalSeconds, todayStudySeconds, onGoalChange }: TodayGoalCardProps) {
  const initialDraft = useMemo(() => splitGoalSeconds(goalSeconds), [goalSeconds]);
  const [hours, setHours] = useState(initialDraft.hours);
  const [minutes, setMinutes] = useState(initialDraft.minutes);
  const progress = goalSeconds ? Math.min(100, Math.round((todayStudySeconds / goalSeconds) * 100)) : 0;
  const remainingSeconds = goalSeconds ? Math.max(0, goalSeconds - todayStudySeconds) : 0;

  useEffect(() => {
    setHours(initialDraft.hours);
    setMinutes(initialDraft.minutes);
  }, [initialDraft]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hourValue = Math.max(0, Number(hours) || 0);
    const minuteValue = Math.min(59, Math.max(0, Number(minutes) || 0));
    const nextGoalSeconds = hourValue * 3600 + minuteValue * 60;

    onGoalChange(nextGoalSeconds > 0 ? nextGoalSeconds : null);
  }

  return (
    <Card className="space-y-4 rounded-[1.35rem] p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-accent">
          <Target className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <CardTitle>Today's Goal</CardTitle>
          <CardDescription className="mt-1">
            {goalSeconds ? `${progress}% complete` : "Choose a steady target for today."}
          </CardDescription>
        </div>
      </div>

      {goalSeconds ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{formatStudyDuration(todayStudySeconds)}</span>
            <span className="text-muted-foreground">of {formatStudyDuration(goalSeconds)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {remainingSeconds > 0
              ? `${formatStudyDuration(remainingSeconds)} left today.`
              : "Goal met. Nice steady work."}
          </p>
        </div>
      ) : null}

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="todayGoalHours">Hours</Label>
            <Input
              id="todayGoalHours"
              type="number"
              min={0}
              max={24}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="todayGoalMinutes">Minutes</Label>
            <Input
              id="todayGoalMinutes"
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" className="flex-1">
            Save goal
          </Button>
          {goalSeconds ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-11 shrink-0 px-0"
              onClick={() => onGoalChange(null)}
              aria-label="Clear today's goal"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
