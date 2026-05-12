"use client";

import { Info, TimerIcon, X } from "lucide-react";
import { useRef, useState } from "react";

import { BgmPlayer, type BgmPlayerHandle } from "@/components/dashboard/bgm-player";
import { PomodoroTimer } from "@/components/dashboard/pomodoro-timer";
import { StopwatchTimer } from "@/components/dashboard/stopwatch-timer";
import { TodayGoalCard } from "@/components/dashboard/today-goal-card";
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
  todayGoalSeconds: number | null;
  todayStudySeconds: number;
  onTodayGoalChange: (goalSeconds: number | null) => void;
}

export function TimerCard({
  profile,
  onSessionSaved,
  todayGoalSeconds,
  todayStudySeconds,
  onTodayGoalChange
}: TimerCardProps) {
  const bgmRef = useRef<BgmPlayerHandle>(null);
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [bgm, setBgm] = useState(profile.preferred_bgm);
  const [volume, setVolume] = useState(0.45);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
        <Card className="overflow-hidden rounded-[1.35rem] p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <TimerIcon className="h-7 w-7 text-accent" aria-hidden="true" />
                <CardTitle className="text-2xl">Focus Timer</CardTitle>
              </div>

              <button
                type="button"
                onClick={() => setShowHowItWorks(true)}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-accent transition hover:bg-muted/80"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
                How it works
              </button>
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

          <div className="p-6">
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
          <TodayGoalCard
            goalSeconds={todayGoalSeconds}
            todayStudySeconds={todayStudySeconds}
            onGoalChange={onTodayGoalChange}
          />
          <TodoList />
        </div>
      </section>

      {showHowItWorks ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowHowItWorks(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="timer-help-title"
            className="card-surface w-full max-w-lg rounded-[1.35rem] border border-border/70 p-6 shadow-soft"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle id="timer-help-title">How it works</CardTitle>
                <CardDescription className="mt-2">
                  A few details about saving time, audio, and active sessions.
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close how it works"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-foreground/80">
              <p>Stopwatch sessions use real timestamps and exclude paused time.</p>
              <p>Pomodoro focus blocks are saved as study sessions; breaks are kept separate.</p>
              <p>Sessions under 60 seconds ask for confirmation before they are stored.</p>
              <p>Active timer state is saved locally, so a refresh can resume the current timer.</p>
              <p>
                Ambient audio starts only after a study session is running and follows the selected track and volume.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
