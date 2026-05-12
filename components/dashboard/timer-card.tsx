"use client";

import { TimerIcon } from "lucide-react";
import { useRef, useState } from "react";

import { BgmPlayer, type BgmPlayerHandle } from "@/components/dashboard/bgm-player";
import { PomodoroTimer } from "@/components/dashboard/pomodoro-timer";
import { StopwatchTimer } from "@/components/dashboard/stopwatch-timer";
import { Card, CardTitle } from "@/components/shared/card";
import { cn } from "@/lib/utils";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
type TimerMode = "stopwatch" | "pomodoro";

interface TimerCardProps {
  profile: ProfileRow;
  onSessionSaved: (session: StudySessionRow) => void;
}

export function TimerCard({
  profile,
  onSessionSaved
}: TimerCardProps) {
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
    <Card className="overflow-hidden rounded-[1.35rem] p-0">
      <div className="border-b border-border/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-accent">
              <TimerIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Focus Timer</CardTitle>
          </div>

          <div className="grid grid-cols-2 rounded-full bg-muted/80 p-1">
            {(["stopwatch", "pomodoro"] as const).map((timerMode) => (
              <button
                key={timerMode}
                type="button"
                onClick={() => setMode(timerMode)}
                disabled={isBusy && mode !== timerMode}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium capitalize transition disabled:opacity-50",
                  mode === timerMode ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {timerMode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
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

        <div className="mt-6 border-t border-border/70 pt-5">
          <BgmPlayer
            ref={bgmRef}
            track={bgm}
            volume={volume}
            shouldPlay={shouldPlay}
            embedded
            onTrackChange={setBgm}
            onVolumeChange={setVolume}
          />
        </div>
      </div>
    </Card>
  );
}
