"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AudioLines, ChevronDown } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Label, Select } from "@/components/shared/input";
import { BGM_OPTIONS, AUDIO_TRACKS } from "@/lib/constants";
import type { Profile } from "@/types/database";
export interface BgmPlayerHandle {
  playFromGesture: () => Promise<void>;
  pause: (reset?: boolean) => void;
}
type Props = {
  track: Profile["preferred_bgm"];
  volume: number;
  shouldPlay: boolean;
  embedded?: boolean;
  onTrackChange: (value: Profile["preferred_bgm"]) => void;
  onVolumeChange: (value: number) => void;
};
export const BgmPlayer = forwardRef<BgmPlayerHandle, Props>(function BgmPlayer(
  { track, volume, shouldPlay, onTrackChange, onVolumeChange },
  ref
) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const play = useCallback(async () => {
    const element = audio.current;
    if (!element || track === "off") return;
    setError(null);
    try {
      await element.play();
    } catch {
      setError("This sound could not play. Try Preview or choose another sound.");
    }
  }, [track]);
  useImperativeHandle(
    ref,
    () => ({
      playFromGesture: play,
      pause(reset = false) {
        audio.current?.pause();
        if (reset && audio.current) audio.current.currentTime = 0;
      }
    }),
    [play]
  );
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    if (shouldPlay && track !== "off") void play();
    else audio.current?.pause();
    return () => {
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
    };
  }, [play, shouldPlay, track]);
  function preview() {
    void play();
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    if (!shouldPlay) previewTimeout.current = setTimeout(() => audio.current?.pause(), 5000);
  }
  return (
    <details className="ambient-panel rounded-xl bg-muted/45 px-3 py-1">
      <summary className="cursor-pointer text-[13px] font-medium">
        <AudioLines size={17} className="text-muted-foreground" aria-hidden="true" />
        Ambient sound{" "}
        <span className="font-normal text-muted-foreground">
          · {playing ? "Playing" : track === "off" ? "Off" : "Paused"}
        </span>
        <ChevronDown
          size={15}
          className="ambient-chevron ml-auto text-muted-foreground transition-transform"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <Label htmlFor="sound">Sound</Label>
          <Select
            id="sound"
            value={track}
            onChange={(e) => {
              setError(null);
              onTrackChange(e.target.value as Profile["preferred_bgm"]);
            }}
          >
            {BGM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button className="self-end" variant="outline" disabled={track === "off"} onClick={preview}>
          Preview
        </Button>
        <div>
          <Label htmlFor="volume">Volume · {Math.round(volume * 100)}%</Label>
          <input
            id="volume"
            className="min-h-11 w-full accent-[hsl(var(--accent))]"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <audio
        ref={audio}
        src={track === "off" ? undefined : AUDIO_TRACKS[track]}
        preload="none"
        loop
        onPlaying={() => {
          setPlaying(true);
          setError(null);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError("This sound is unavailable. Please choose another sound.");
        }}
      />
    </details>
  );
});
