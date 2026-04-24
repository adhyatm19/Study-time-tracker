"use client";

import { useRef, useState } from "react";

import { BgmPlayer, type BgmPlayerHandle } from "@/components/dashboard/bgm-player";
import { PomodoroTimer } from "@/components/dashboard/pomodoro-timer";
import { StopwatchTimer } from "@/components/dashboard/stopwatch-timer";
import { Button } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
type TimerMode = "stopwatch" | "pomodoro";

interface TimerCardProps {
  profile: ProfileRow;
  onSessionSaved: (session: StudySessionRow) => void;
}

export function TimerCard({ profile, onSessionSaved }: TimerCardProps) {
  const bgmRef = useRef<BgmPlayerHandle>(null);
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [bgm, setBgm] = useState(profile.preferred_bgm);
  const [volume, setVolume] = useState(0.45);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  function handleStartGesture() {
    const playPromise = bgmRef.current?.playFromGesture();
    if (playPromise) {
      void playPromise.catch(() => {
        // Browsers can still reject autoplay until audio is unlocked by user interaction.
      });
    }
  }

  function handleStudyStateChange(isStudying: boolean) {
    setShouldPlay(isStudying);

    if (!isStudying) {
      bgmRef.current?.pause();
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border/70 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Focus timer</p>
            <CardTitle className="mt-3 text-2xl">Track sessions with real timestamps, not guesswork.</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Choose a free stopwatch or a Pomodoro cycle, then settle into ambient audio while the timer is actively studying.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "stopwatch" ? "primary" : "outline"}
              onClick={() => setMode("stopwatch")}
              disabled={isBusy && mode !== "stopwatch"}
            >
              Stopwatch
            </Button>
            <Button
              variant={mode === "pomodoro" ? "primary" : "outline"}
              onClick={() => setMode("pomodoro")}
              disabled={isBusy && mode !== "pomodoro"}
            >
              Pomodoro
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-background/60 p-6">
          {mode === "stopwatch" ? (
            <StopwatchTimer
              onSessionSaved={onSessionSaved}
              onStartGesture={handleStartGesture}
              onStudyStateChange={handleStudyStateChange}
              onBusyStateChange={setIsBusy}
            />
          ) : (
            <PomodoroTimer
              defaultFocusMinutes={profile.default_focus_minutes}
              defaultBreakMinutes={profile.default_break_minutes}
              onSessionSaved={onSessionSaved}
              onStartGesture={handleStartGesture}
              onStudyStateChange={handleStudyStateChange}
              onBusyStateChange={setIsBusy}
            />
          )}
        </div>

        <BgmPlayer
          ref={bgmRef}
          track={bgm}
          volume={volume}
          shouldPlay={shouldPlay}
          onTrackChange={setBgm}
          onVolumeChange={setVolume}
        />
      </div>
    </Card>
  );
}
