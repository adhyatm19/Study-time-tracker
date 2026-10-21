"use client";
import { useEffect, useRef, type ReactNode } from "react";

const RADIUS = 108;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TimerRing({
  progress,
  tone,
  children
}: {
  progress: number;
  tone: "focus" | "break";
  children: ReactNode;
}) {
  const value = Math.min(100, Math.max(0, progress));
  const previous = useRef(value);
  // Animate forward ticks only; snap back when a phase or minute restarts.
  const jump = value < previous.current;
  useEffect(() => {
    previous.current = value;
  }, [value]);
  return (
    <div className={`timer-ring ${tone === "break" ? "tone-green" : "tone-blue"}`}>
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle className="timer-ring-track" cx="120" cy="120" r={RADIUS} />
        <circle
          className="timer-ring-value"
          cx="120"
          cy="120"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
          style={jump ? { transition: "none" } : undefined}
          opacity={value > 0 ? 1 : 0}
        />
      </svg>
      <div className="timer-ring-content">{children}</div>
    </div>
  );
}
