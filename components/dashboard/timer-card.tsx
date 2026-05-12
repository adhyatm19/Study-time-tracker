"use client";

import { Info, TimerIcon } from "lucide-react";
import { useRef, useState } from "react";

import { BgmPlayer, type BgmPlayerHandle } from "@/components/dashboard/bgm-player";
import { PomodoroTimer } from "@/components/dashboard/pomodoro-timer";
import { StopwatchTimer } from "@/components/dashboard/stopwatch-timer";
import { TodoList } from "@/components/dashboard/todo-list";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { cn } from "@/lib/utils";
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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
      <Card className="overflow-hidden rounded-[1.35rem] p-0">
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <TimerIcon className="h-7 w-7 text-accent" aria-hidden="true" />
              <CardTitle className="text-2xl">Focus Timer</CardTitle>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-accent">
              <Info className="h-4 w-4" aria-hidden="true" />
              How it works
            </div>
          </div>

          <div className="mt-5 flex gap-6 border-b border-border/70">
            {(["stopwatch", "pomodoro"] as const).map((timerMode) => (
              <button
                key={timerMode}
                type="button"
                onClick={() => setMode(timerMode)}
                disabled={isBusy && mode !== timerMode}
                className={cn(
                  "-mb-px border-b-2 px-1 pb-3 text-sm font-medium capitalize transition disabled:opacity-50",
                  mode === timerMode
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {timerMode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.72fr)] lg:items-center">
          <div>
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

          <div className="space-y-8">
            <div>
              <CardTitle>Timer settings</CardTitle>
              <CardDescription className="mt-3">
                Track sessions with real timestamps, so refreshes and pauses do not distort your study time.
              </CardDescription>
            </div>

            <div className="rounded-2xl bg-muted p-5 text-sm leading-6 text-foreground/80">
              <p>Sessions under 60 seconds ask for confirmation before they are stored.</p>
              <p className="mt-3">Active timer state is saved locally, so you can refresh and still resume.</p>
            </div>

            <div className="border-t border-border/70 pt-7">
              <CardTitle>Ambient audio</CardTitle>
              <CardDescription className="mt-3">
                Pick a sound from the music panel. It starts only after a study session is actively running.
              </CardDescription>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <BgmPlayer
          ref={bgmRef}
          track={bgm}
          volume={volume}
          shouldPlay={shouldPlay}
          onTrackChange={setBgm}
          onVolumeChange={setVolume}
        />
        <TodoList />
      </div>
    </section>
  );
}
