"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Check, Music2, Play, Volume2, VolumeX } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { AUDIO_TRACKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { type Database } from "@/types/database";

type BgmOption = Database["public"]["Tables"]["profiles"]["Row"]["preferred_bgm"];

export interface BgmPlayerHandle {
  playFromGesture: () => Promise<void>;
  pause: (reset?: boolean) => void;
}

interface BgmPlayerProps {
  track: BgmOption;
  volume: number;
  shouldPlay: boolean;
  embedded?: boolean;
  onTrackChange: (value: BgmOption) => void;
  onVolumeChange: (value: number) => void;
}

const FILTERS = ["All", "Focus", "Nature", "Rain"] as const;

const TRACK_CARDS: Array<{
  value: BgmOption;
  label: string;
  category: (typeof FILTERS)[number];
  detail: string;
  swatch: string;
}> = [
  {
    value: "off",
    label: "Off",
    category: "All",
    detail: "Silence for deep work",
    swatch: "from-stone-200 to-stone-100 dark:from-stone-700 dark:to-stone-800"
  },
  {
    value: "white-noise",
    label: "Lo-fi Focus",
    category: "Focus",
    detail: "Soft texture to keep you in the zone",
    swatch: "from-emerald-900 to-stone-500 dark:from-emerald-700 dark:to-stone-900"
  },
  {
    value: "fireplace",
    label: "Warm Fireplace",
    category: "Nature",
    detail: "Gentle warmth for longer sessions",
    swatch: "from-amber-800 to-stone-600 dark:from-amber-700 dark:to-stone-950"
  },
  {
    value: "rain",
    label: "Rainy Day",
    category: "Rain",
    detail: "Rainfall ambience for focused study",
    swatch: "from-slate-500 to-emerald-900 dark:from-slate-500 dark:to-emerald-950"
  }
];

export const BgmPlayer = forwardRef<BgmPlayerHandle, BgmPlayerProps>(function BgmPlayer(
  { track, volume, shouldPlay, embedded = false, onTrackChange, onVolumeChange },
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");
  const visibleTracks = TRACK_CARDS.filter(
    (trackCard) => activeFilter === "All" || trackCard.category === activeFilter || trackCard.value === "off"
  );
  const nowPlayingTrack =
    shouldPlay && track !== "off" ? TRACK_CARDS.find((trackCard) => trackCard.value === track) : null;
  const selectedTrack = TRACK_CARDS.find((trackCard) => trackCard.value === track);

  function syncSource() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (track === "off") {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    const nextSource = AUDIO_TRACKS[track];
    if (!audio.src.endsWith(nextSource)) {
      audio.src = nextSource;
      audio.load();
    }
  }

  useImperativeHandle(ref, () => ({
    async playFromGesture() {
      const audio = audioRef.current;
      if (!audio || track === "off") {
        return;
      }

      syncSource();
      audio.loop = true;
      audio.volume = volume;
      await audio.play();
    },
    pause(reset = false) {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      audio.pause();
      if (reset) {
        audio.currentTime = 0;
      }
    }
  }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    syncSource();
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (track === "off" || !shouldPlay) {
      audio.pause();
      return;
    }

    audio.loop = true;
    void audio.play().catch(() => {
      // Playback can fail until the user starts a timer from a click gesture.
    });
  }, [shouldPlay, track]);

  const Wrapper = embedded ? "div" : Card;

  return (
    <Wrapper className={cn("space-y-4", embedded ? "rounded-2xl border border-border/70 bg-background/55 p-4" : "rounded-[1.35rem] p-5")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-accent">
          <Music2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base">Ambient Music</CardTitle>
            <CardDescription className="mt-0.5">
              {nowPlayingTrack
                ? `Now playing: ${nowPlayingTrack.label}`
                : `Selected: ${selectedTrack?.label ?? "Off"}`}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-3 py-2">
          {volume > 0 ? (
            <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <input
            id="bgmVolume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="w-24 accent-[hsl(var(--accent))] sm:w-28"
            aria-label="Ambient audio volume"
          />
          <span className="w-9 text-right text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-muted/80 p-1">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition",
              activeFilter === filter ? "bg-accent text-accent-foreground shadow-sm" : "text-foreground hover:bg-card/70"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {visibleTracks.map((trackCard) => {
          const isSelected = track === trackCard.value;

          return (
            <button
              key={trackCard.value}
              type="button"
              onClick={() => onTrackChange(trackCard.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/55 px-3 py-3 text-left transition hover:bg-card",
                isSelected && "border-accent/40 bg-muted/80"
              )}
            >
              <div
                className={cn(
                  "h-10 w-12 shrink-0 rounded-xl bg-gradient-to-br shadow-sm",
                  trackCard.swatch,
                  isSelected && "ring-2 ring-accent/40 ring-offset-2 ring-offset-card"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{trackCard.label}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{trackCard.detail}</p>
              </div>
              {trackCard.value === "off" ? (
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-muted-foreground",
                    isSelected && "border-accent bg-accent text-accent-foreground"
                  )}
                  aria-label={isSelected ? "Selected sound" : "Muted sound"}
                >
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-accent",
                    isSelected && "border-accent bg-accent text-accent-foreground"
                  )}
                  aria-label={isSelected ? "Selected sound" : "Select sound"}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <audio ref={audioRef} preload="auto" />
    </Wrapper>
  );
});
