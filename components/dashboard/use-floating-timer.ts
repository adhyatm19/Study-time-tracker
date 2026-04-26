"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type PomodoroPhase } from "@/lib/timers";

type FloatingTimerMode = "stopwatch" | "pomodoro";
type FloatingTimerStatus = "idle" | "running" | "paused";
type FloatingTimerRounding = "floor" | "ceil";

interface FloatingTimerSnapshot {
  mode: FloatingTimerMode;
  phase?: PomodoroPhase;
  seconds: number;
  status: FloatingTimerStatus;
  rounding: FloatingTimerRounding;
}

const FLOATING_TIMER_SIZE = {
  width: 220,
  height: 120
};

export function formatFloatingTimerTime(totalSeconds: number, rounding: FloatingTimerRounding) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = rounding === "ceil" ? Math.ceil(safeSeconds / 60) : Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes}m`;
}

function getModeLabel(mode: FloatingTimerMode) {
  return mode === "pomodoro" ? "Pomodoro" : "Stopwatch";
}

function getPhaseLabel(phase?: PomodoroPhase) {
  if (!phase) {
    return "";
  }

  return phase === "focus" ? "Focus" : "Break";
}

function getStatusLabel(status: FloatingTimerStatus) {
  if (status === "idle") {
    return "Stopped";
  }

  return status === "running" ? "Running" : "Paused";
}

function isFloatingTimerSupported() {
  return typeof window !== "undefined" && "documentPictureInPicture" in window && Boolean(window.documentPictureInPicture);
}

function readThemeVariables() {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const bodyStyles = window.getComputedStyle(document.body);
  const themeClass = document.documentElement.classList.contains("dark") ? "dark" : "";

  return {
    themeClass,
    fontSans: rootStyles.getPropertyValue("--font-sans").trim() || bodyStyles.fontFamily,
    background: rootStyles.getPropertyValue("--background").trim(),
    foreground: rootStyles.getPropertyValue("--foreground").trim(),
    card: rootStyles.getPropertyValue("--card").trim(),
    border: rootStyles.getPropertyValue("--border").trim(),
    muted: rootStyles.getPropertyValue("--muted").trim(),
    mutedForeground: rootStyles.getPropertyValue("--muted-foreground").trim()
  };
}

export function useFloatingTimer(snapshot: FloatingTimerSnapshot) {
  const [message, setMessage] = useState<string | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const snapshotRef = useRef(snapshot);

  const getActiveWindow = useCallback(() => {
    const currentWindow = pipWindowRef.current;

    if (currentWindow && !currentWindow.closed) {
      return currentWindow;
    }

    const apiWindow = window.documentPictureInPicture?.window ?? null;

    if (apiWindow && !apiWindow.closed) {
      pipWindowRef.current = apiWindow;
      return apiWindow;
    }

    pipWindowRef.current = null;
    return null;
  }, []);

  const updateFloatingWindow = useCallback(
    (statusOverride?: string) => {
      if (!isFloatingTimerSupported()) {
        return;
      }

      const pipWindow = getActiveWindow();

      if (!pipWindow) {
        return;
      }

      const current = snapshotRef.current;
      const mode = pipWindow.document.querySelector<HTMLElement>("[data-floating-timer-mode]");
      const phase = pipWindow.document.querySelector<HTMLElement>("[data-floating-timer-phase]");
      const time = pipWindow.document.querySelector<HTMLElement>("[data-floating-timer-time]");
      const status = pipWindow.document.querySelector<HTMLElement>("[data-floating-timer-status]");
      const timeLabel = formatFloatingTimerTime(current.seconds, current.rounding);

      if (mode) {
        mode.textContent = getModeLabel(current.mode);
      }

      if (phase) {
        const phaseLabel = getPhaseLabel(current.phase);
        phase.textContent = phaseLabel;
        phase.hidden = current.mode !== "pomodoro";
      }

      if (time) {
        time.textContent = timeLabel;
      }

      if (status) {
        status.textContent = statusOverride ?? getStatusLabel(current.status);
      }

      pipWindow.document.title = `${getModeLabel(current.mode)} ${timeLabel}`;
    },
    [getActiveWindow]
  );

  const closeFloatingTimer = useCallback(() => {
    const pipWindow = isFloatingTimerSupported() ? getActiveWindow() : null;

    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }

    pipWindowRef.current = null;
  }, [getActiveWindow]);

  const buildFloatingWindow = useCallback(
    (pipWindow: Window) => {
      const theme = readThemeVariables();
      const pipDocument = pipWindow.document;
      const style = pipDocument.createElement("style");
      const container = pipDocument.createElement("main");

      pipDocument.documentElement.className = theme.themeClass;
      pipDocument.body.replaceChildren();

      style.textContent = `
        :root {
          --font-sans: ${theme.fontSans};
          --background: ${theme.background};
          --foreground: ${theme.foreground};
          --card: ${theme.card};
          --border: ${theme.border};
          --muted: ${theme.muted};
          --muted-foreground: ${theme.mutedForeground};
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
        }

        body {
          display: grid;
          place-items: center;
          padding: 10px;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          font-family: var(--font-sans);
          font-feature-settings: "ss01", "cv02", "cv03";
        }

        .floating-timer {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid hsl(var(--border));
          border-radius: 22px;
          background: color-mix(in srgb, hsl(var(--card)) 94%, hsl(var(--muted)) 6%);
          text-align: center;
        }

        .floating-timer__mode {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
        }

        .floating-timer__phase {
          min-height: 16px;
          font-size: 13px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .floating-timer__phase[hidden] {
          display: none;
        }

        .floating-timer__time {
          font-size: 32px;
          line-height: 1;
          font-weight: 700;
          color: hsl(var(--foreground));
        }

        .floating-timer__status {
          font-size: 12px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
        }
      `;

      container.className = "floating-timer";
      container.innerHTML = `
        <div class="floating-timer__mode" data-floating-timer-mode></div>
        <div class="floating-timer__phase" data-floating-timer-phase></div>
        <div class="floating-timer__time" data-floating-timer-time></div>
        <div class="floating-timer__status" data-floating-timer-status></div>
      `;

      pipDocument.head.replaceChildren(style);
      pipDocument.body.append(container);
      pipWindow.addEventListener("pagehide", () => {
        pipWindowRef.current = null;
      });

      updateFloatingWindow();
    },
    [updateFloatingWindow]
  );

  const openFloatingTimer = useCallback(async () => {
    setMessage(null);

    if (!isFloatingTimerSupported()) {
      setMessage("Floating timer is not supported in this browser.");
      return;
    }

    if (snapshotRef.current.status === "idle") {
      setMessage("Start a timer before opening the floating timer.");
      return;
    }

    const existingWindow = getActiveWindow();

    if (existingWindow) {
      existingWindow.focus();
      updateFloatingWindow();
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture?.requestWindow(FLOATING_TIMER_SIZE);

      if (!pipWindow) {
        setMessage("Floating timer is not supported in this browser.");
        return;
      }

      pipWindowRef.current = pipWindow;
      buildFloatingWindow(pipWindow);
    } catch {
      setMessage("Floating timer could not be opened.");
    }
  }, [buildFloatingWindow, getActiveWindow, updateFloatingWindow]);

  useEffect(() => {
    snapshotRef.current = snapshot;

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (snapshot.status === "idle") {
      const pipWindow = isFloatingTimerSupported() ? getActiveWindow() : null;

      if (pipWindow) {
        updateFloatingWindow("Stopped");
        closeTimeoutRef.current = window.setTimeout(() => {
          closeFloatingTimer();
        }, 900);
      }

      return;
    }

    updateFloatingWindow();
  }, [closeFloatingTimer, getActiveWindow, snapshot, updateFloatingWindow]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      closeFloatingTimer();
    };
  }, [closeFloatingTimer]);

  return {
    openFloatingTimer,
    floatingTimerMessage: message
  };
}

