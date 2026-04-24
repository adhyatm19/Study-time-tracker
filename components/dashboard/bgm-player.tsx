"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { CardDescription } from "@/components/shared/card";
import { Label, Select } from "@/components/shared/input";
import { AUDIO_TRACKS, BGM_OPTIONS } from "@/lib/constants";
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
  onTrackChange: (value: BgmOption) => void;
  onVolumeChange: (value: number) => void;
}

export const BgmPlayer = forwardRef<BgmPlayerHandle, BgmPlayerProps>(function BgmPlayer(
  { track, volume, shouldPlay, onTrackChange, onVolumeChange },
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Ambient BGM</p>
          <CardDescription className="mt-1">Audio only plays while a focus session is actively running.</CardDescription>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor="bgmTrack">Sound</Label>
          <Select id="bgmTrack" value={track} onChange={(event) => onTrackChange(event.target.value as BgmOption)}>
            {BGM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="bgmVolume">Volume</Label>
          <div className="flex h-[52px] items-center gap-3 rounded-3xl border border-border/80 bg-background/80 px-4">
            <input
              id="bgmVolume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className="w-32 accent-[hsl(var(--accent))]"
            />
            <span className="w-10 text-right text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="auto" />
    </div>
  );
});
